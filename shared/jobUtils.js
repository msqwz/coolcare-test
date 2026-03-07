/**
 * Shared utilities for job calculations and formatting
 */

export const calculateJobTotal = (job) => {
    if (!job) return 0
    const price = parseFloat(job.price)
    if (price > 0) return price

    return (job.services || []).reduce((sum, service) => {
        const sPrice = parseFloat(service.price) || 0
        const sQty = parseInt(service.quantity) || 1
        return sum + (sPrice * sQty)
    }, 0)
}

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    }).format(amount)
}

export const getStatusConfig = (status, statusList = []) => {
    return statusList.find(s => s.key === status) || { label: status, color: '#64748b' }
}

export const formatDuration = (from, to) => {
    if (!from || !to) return ''
    const ms = new Date(to).getTime() - new Date(from).getTime()
    if (!Number.isFinite(ms) || ms <= 0) return ''
    const totalMinutes = Math.floor(ms / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) return `${hours} ч ${minutes} мин`
    return `${minutes} мин`
}

export const formatTimeRange = (from, to) => {
    if (!from || !to) return ''
    const fromStr = new Date(from).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
    const toStr = new Date(to).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${fromStr} — ${toStr}`
}
