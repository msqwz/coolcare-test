import { request, commonApi } from '@shared/api-base'

export const api = {
    async request(endpoint, options = {}) {
        return request(endpoint, options)
    },

    ...commonApi,

    // Admin Specific
    async getAllJobs(offset = 0, limit = 50) {
        return this.request(`/admin/jobs?offset=${offset}&limit=${limit}`)
    },
    async getAdminStats() {
        return this.request('/admin/stats')
    },

    // Shared Job Actions
    async updateJob(id, job) {
        return this.request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) })
    },
    async deleteJob(id) {
        return this.request(`/jobs/${id}`, { method: 'DELETE' })
    },

    // Admin Job Actions
    async adminUpdateJob(id, job) {
        return this.request(`/admin/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) })
    },
    async adminDeleteJob(id) {
        return this.request(`/admin/jobs/${id}`, { method: 'DELETE' })
    },
    async adminCreateJob(job) {
        return this.request('/admin/jobs', { method: 'POST', body: JSON.stringify(job) })
    },

    // Workers Management
    async getWorkers() {
        return this.request('/admin/users')
    },
    async updateWorker(id, data) {
        return this.request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    async createWorker(data) {
        return this.request('/admin/users', { method: 'POST', body: JSON.stringify(data) })
    },
    async deleteWorker(id) {
        return this.request(`/admin/users/${id}`, { method: 'DELETE' })
    },

    // Predefined Services
    async getPredefinedServices() {
        return this.request('/admin/services')
    },
    async createPredefinedService(service) {
        return this.request('/admin/services', { method: 'POST', body: JSON.stringify(service) })
    },
    async updatePredefinedService(id, service) {
        return this.request(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(service) })
    },
    async deletePredefinedService(id) {
        return this.request(`/admin/services/${id}`, { method: 'DELETE' })
    },

    // Chat
    async getChatConversations() {
        return this.request('/admin/chat/conversations')
    },
    async getChatWithUser(userId) {
        return this.request(`/admin/chat/messages/${userId}`)
    },
    async sendChatMessage(data) {
        return this.request('/chat/messages', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    }
}
