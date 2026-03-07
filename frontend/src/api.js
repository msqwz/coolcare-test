const API_URL =
  import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
    ? import.meta.env.VITE_API_URL
    : window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000'
      : window.location.origin

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
    if (response.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.reload()
      throw new Error('Unauthorized')
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(error.detail || 'Request failed')
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
  async getTodayJobs() {
    return this.request('/jobs/today')
  },
  async getJobs(status) {
    return this.request(`/jobs${status ? '?status=' + status : ''}`)
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
