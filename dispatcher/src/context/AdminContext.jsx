import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { supabase } from '@shared/supabase'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [jobs, setJobs] = useState([])
    const [workers, setWorkers] = useState([])

    const loadData = useCallback(async () => {
        try {
            const [s, j, w] = await Promise.all([
                api.getAdminStats(),
                api.getAllJobs(),
                api.getWorkers()
            ])
            setStats(s)
            setJobs(j)
            setWorkers(w)
        } catch (e) {
            console.error('Failed to load admin data:', e)
        }
    }, [])

    const handleLogin = useCallback(async () => {
        setLoading(true)
        try {
            const u = await api.getCurrentUser()
            if (u.role !== 'admin') {
                throw new Error('У вас нет прав администратора')
            }
            setUser(u)
            await loadData()
        } catch (e) {
            console.error(e)
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
        } finally {
            setLoading(false)
        }
    }, [loadData])

    useEffect(() => {
        if (user) {
            loadData()

            // Real-time updates via Supabase
            const channel = supabase
                .channel('admin-updates')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'jobs' },
                    (payload) => {
                        console.log('Real-time job update:', payload)
                        if (payload.eventType === 'INSERT') {
                            setJobs(prev => [payload.new, ...prev])
                        } else if (payload.eventType === 'UPDATE') {
                            setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new : j))
                        } else if (payload.eventType === 'DELETE') {
                            setJobs(prev => prev.filter(j => j.id === payload.old.id))
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'users' },
                    (payload) => {
                        console.log('Real-time user update:', payload)
                        if (payload.eventType === 'UPDATE') {
                            setWorkers(prev => prev.map(w => w.id === payload.new.id ? payload.new : w))
                        } else if (payload.eventType === 'INSERT') {
                            setWorkers(prev => [payload.new, ...prev])
                        }
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [user, loadData])

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (token) {
            handleLogin()
        } else {
            setLoading(false)
        }
    }, [handleLogin])

    const value = {
        user,
        loading,
        stats,
        jobs,
        workers,
        loadData,
        handleLogin,
        setUser,
        setJobs,
        setWorkers
    }

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
    const ctx = useContext(AdminContext)
    if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
    return ctx
}
