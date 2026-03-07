import { JOB_TYPE_LIST } from '../constants'

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeAddress(value) {
  return normalizeText(value)
    .replace(/\bул\.?\b/g, 'улица')
    .replace(/\bпр-т\b/g, 'проспект')
    .replace(/\bпросп\.\b/g, 'проспект')
    .replace(/\bд\.?\b/g, 'дом')
    .replace(/\bкорп\.?\b/g, 'корпус')
    .replace(/\bкв\.?\b/g, 'квартира')
}

/**
 * Фильтрует заявки по поиску, статусу и типу
 * @param {Array} jobs - список заявок
 * @param {{ search?: string, status?: string, jobType?: string, date?: string }} filters
 */
export function filterJobs(jobs, { search = '', status = '', jobType = '', date = '' }) {
  return jobs.filter((job) => {
    if (status && job.status !== status) return false
    if (jobType && job.job_type !== jobType) return false
    if (date && (!job.scheduled_at || job.scheduled_at.slice(0, 10) !== date)) return false
    if (!search || !search.trim()) return true
    const q = normalizeText(search)
    const qTokens = q.split(' ').filter(Boolean)
    const customer = normalizeText(job.customer_name)
    const address = normalizeAddress(job.address)
    const typeLabel = normalizeText(JOB_TYPE_LIST.find((t) => t.key === job.job_type)?.label || '')
    const description = normalizeText(job.description)
    const notes = normalizeText(job.notes)
    const text = `${customer} ${typeLabel} ${description} ${notes}`
    const textMatch = qTokens.every((token) => text.includes(token))
    const addressMatch = qTokens.every((token) => address.includes(token))
    return (
      textMatch ||
      addressMatch
    )
  })
}
