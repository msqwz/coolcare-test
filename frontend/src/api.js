const API_URL =
  import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
    ? import.meta.env.VITE_API_URL
    : window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000'
      : window.location.origin

export const api = {
  async request(endpoint, options = {}, isRetry = false) {
    const token = localStorage.getItem('access_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
    
    if (response.status === 401) {
      if (!isRetry) {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            })
            if (refreshRes.ok) {
              const data = await refreshRes.json()
              localStorage.setItem('access_token', data.access_token)
              return this.request(endpoint, options, true)
            }
          } catch (e) {
            console.error('Token refresh failed', e)
          }
        }
      }
      
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.reload()
      throw new Error('Unauthorized')
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      let errorMessage = error.detail || 'Request failed'
      
      if (Array.isArray(error.detail)) {
        errorMessage = error.detail
          .map(err => `${err.loc.join('.')}: ${err.msg}`)
          .join('; ')
      } else if (typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail)
      }
      
      throw new Error(errorMessage)
    }
    return response.json()
  },
  async sendCode(phone) {
    return this.request('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) })
  },
  async verifyCode(phone, code) {
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    })
  },
  async getCurrentUser() {
    return this.request('/auth/me')
  },
  async getDashboardStats() {
    return this.request('/dashboard/stats')
  },
  async resetDashboardStats() {
    return this.request('/dashboard/reset-stats', { method: 'POST' })
  },
  async getTodayJobs(offset = 0, limit = 50) {
    return this.request(`/jobs/today?offset=${offset}&limit=${limit}`)
  },
  async getJobs(status, offset = 0, limit = 50) {
    const url = new URL('/jobs', API_URL)
    if (status) url.searchParams.append('status', status)
    url.searchParams.append('offset', offset)
    url.searchParams.append('limit', limit)
    return this.request(url.pathname + url.search)
  },
  async getJob(id) {
    return this.request(`/jobs/${id}`)
  },
  async createJob(job) {
    if (!navigator.onLine) {
      const { addToSyncQueue } = await import('./offlineStorage')
      await addToSyncQueue({ type: 'CREATE_JOB', data: job })
      return { ...job, id: Date.now(), status: 'scheduled' } // fake id for UI
    }
    return this.request('/jobs', { method: 'POST', body: JSON.stringify(job) })
  },
  async updateJob(id, job) {
    if (!navigator.onLine) {
      const { addToSyncQueue } = await import('./offlineStorage')
      await addToSyncQueue({ type: 'UPDATE_JOB', jobId: id, data: job })
      return { ...job, id }
    }
    return this.request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) })
  },
  async deleteJob(id) {
    if (!navigator.onLine) {
      const { addToSyncQueue } = await import('./offlineStorage')
      await addToSyncQueue({ type: 'DELETE_JOB', jobId: id })
      return { status: 'queued' }
    }
    return this.request(`/jobs/${id}`, { method: 'DELETE' })
  },
  async getRouteOptimize(date) {
    return this.request(`/jobs/route/optimize?date=${date}`)
  },
  async getVapidPublic() {
    return this.request('/push/vapid-public')
  },
  async pushSubscribe(subscription) {
    return this.request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      }),
    })
  },
}
