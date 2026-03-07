const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }
    return window.location.origin;
}

export const API_URL = getApiUrl()

export const request = async (endpoint, options = {}) => {
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
        // Dispatcher uses /admin/login, PWA uses / (login screen)
        if (window.location.pathname.startsWith('/admin')) {
            window.location.href = '/admin/login'
        } else {
            window.location.reload()
        }
        throw new Error('Unauthorized')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }))
        throw new Error(error.detail || 'Request failed')
    }
    return response.json()
}

export const commonApi = {
    async sendCode(phone) {
        return request('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) })
    },
    async verifyCode(phone, code) {
        return request('/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ phone, code }),
        })
    },
    async getCurrentUser() {
        return request('/auth/me')
    },
    async updateJob(id, job) {
        return request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) })
    },
    async deleteJob(id) {
        return request(`/jobs/${id}`, { method: 'DELETE' })
    },
}
