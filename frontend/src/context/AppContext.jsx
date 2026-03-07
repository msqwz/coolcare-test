import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import {
  cacheJobs,
  getCachedJobs,
  cacheJob,
  removeCachedJob,
  cacheStats,
  getCachedStats,
  cacheUser,
  getCachedUser,
  clearUserCache,
  addToSyncQueue,
  processSyncQueue,
} from '../offlineStorage'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [todayJobs, setTodayJobs] = useState([])
  const [syncing, setSyncing] = useState(false)
  const isOnline = useOnlineStatus()

  const loadStats = useCallback(async () => {
    try {
      const d = await api.getDashboardStats()
      setStats(d)
      cacheStats(d)
    } catch (e) {
      const c = await getCachedStats()
      if (c) setStats(c)
    }
  }, [])

  const loadTodayJobs = useCallback(async () => {
    try {
      setTodayJobs(await api.getTodayJobs())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      const d = await api.getJobs()
      setJobs(d)
      cacheJobs(d)
    } catch (e) {
      const c = await getCachedJobs()
      if (c.length > 0) setJobs(c)
    }
  }, [])

  const loadFromCache = useCallback(async () => {
    try {
      const cachedUser = await getCachedUser()
      if (cachedUser) setUser(cachedUser)
      const cachedStats = await getCachedStats()
      if (cachedStats) setStats(cachedStats)
      const cachedJobs = await getCachedJobs()
      if (cachedJobs.length > 0) {
        setJobs(cachedJobs)
        const today = new Date().toISOString().slice(0, 10)
        setTodayJobs(cachedJobs.filter((j) => j.scheduled_at?.slice(0, 10) === today))
      }
    } catch (err) {
      console.error('Cache load error:', err)
    }
  }, [])

  const syncOfflineActions = useCallback(async () => {
    setSyncing(true)
    try {
      const result = await processSyncQueue(api.request.bind(api))
      if (result.synced > 0) {
        loadJobs()
        loadStats()
        loadTodayJobs()
      }
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }, [loadJobs, loadStats, loadTodayJobs])

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadStats(), loadTodayJobs(), loadJobs()])
  }, [loadStats, loadTodayJobs, loadJobs])

  const handleLogin = useCallback(() => {
    api
      .getCurrentUser()
      .then((u) => {
        setUser(u)
        cacheUser(u)
      })
      .catch(console.error)
    loadStats()
    loadTodayJobs()
    loadJobs()
  }, [loadStats, loadTodayJobs, loadJobs])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    clearUserCache()
    setUser(null)
    setJobs([])
    setStats(null)
    setTodayJobs([])
  }, [])

  const handleUpdateUser = useCallback((updated) => {
    setUser(updated)
    cacheUser(updated)
  }, [])

  const handleJobUpdate = useCallback(
    (updated) => {
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
      loadStats()
      loadTodayJobs()
    },
    [loadStats, loadTodayJobs]
  )

  const handleJobDelete = useCallback(() => {
    loadJobs()
    loadStats()
    loadTodayJobs()
  }, [loadJobs, loadStats, loadTodayJobs])

  const handleJobCreated = useCallback(() => {
    loadJobs()
    loadStats()
    loadTodayJobs()
  }, [loadJobs, loadStats, loadTodayJobs])

  const handleStatusChange = useCallback(async (jobId, newStatus) => {
    try {
      const updateData = { status: newStatus }
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_at = null
      }
      const updatedJob = await api.updateJob(jobId, updateData)
      handleJobUpdate(updatedJob)
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }, [handleJobUpdate])

  const handleResetStats = useCallback(async () => {
    await api.resetDashboardStats()
    await Promise.all([loadJobs(), loadStats(), loadTodayJobs()])
  }, [loadJobs, loadStats, loadTodayJobs])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
          console.log('ServiceWorker unregistered successfully');
        }
      }).catch(console.error)
    }
  }, [])

  useEffect(() => {
    if (isOnline && user) {
      syncOfflineActions()
    }
  }, [isOnline, user, syncOfflineActions])

  useEffect(() => {
    if (!user || !isOnline) return

    let watchId = null
    let lastUpdate = 0
    const UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutes

    const requestLocation = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            const now = Date.now()

            // Update if more than 5 mins passed
            if (now - lastUpdate > UPDATE_INTERVAL) {
              try {
                await api.request('/auth/me', {
                  method: 'PUT',
                  body: JSON.stringify({ latitude, longitude })
                })
                lastUpdate = now
                console.log('Location updated:', latitude, longitude)
              } catch (e) {
                console.error('Failed to update location:', e)
              }
            }
          },
          (err) => console.error('Geolocation error:', err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
      }
    }

    requestLocation()
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [user, isOnline])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      if (navigator.onLine) {
        api
          .getCurrentUser()
          .then((u) => {
            setUser(u)
            cacheUser(u)
            loadStats()
            loadTodayJobs()
            loadJobs()
          })
          .catch(() => loadFromCache())
          .finally(() => setLoading(false))
      } else {
        loadFromCache().finally(() => setLoading(false))
      }
    } else {
      setLoading(false)
    }
  }, [loadFromCache, loadStats, loadTodayJobs, loadJobs])

  const isAuthenticated = !!user

  const value = {
    user,
    loading,
    isAuthenticated,
    jobs,
    stats,
    todayJobs,
    syncing,
    isOnline,
    loadJobs,
    loadStats,
    loadTodayJobs,
    handleRefresh,
    handleLogin,
    handleLogout,
    handleUpdateUser,
    handleJobUpdate,
    handleJobDelete,
    handleJobCreated,
    handleStatusChange,
    handleResetStats,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
