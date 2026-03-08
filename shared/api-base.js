const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }
    return window.location.origin;
}

export const API_URL = getApiUrl()

export const request = async (endpoint, options = {}, isRetry = false) => {
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
                        return request(endpoint, options, true)
                    }
                } catch (e) {
                    console.error('Token refresh failed', e)
                }
            }
        }

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
        let errorMessage = error.detail || 'Request failed'
        
        // Если это массив ошибок валидации FastAPI (422)
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
