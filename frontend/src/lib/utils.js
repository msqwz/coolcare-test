export function formatPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(0, 15)
  if (!digits) return ''
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    return `+7${digits.slice(1)}`
  }
  if (digits.length === 10) return `+7${digits}`
  return `+${digits}`
}

export function validatePhone(phone) {
  return /^\+\d{10,15}$/.test(formatPhone(phone))
}

export function normalizePhoneInputRu(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(0, 15)
  if (!digits) return ''
  if (digits.startsWith('8') || digits.startsWith('7')) {
    return `+7${digits.slice(1, 11)}`
  }
  if (digits.length <= 10) return `+7${digits}`
  return `+${digits}`
}

export function validateEmail(email) {
  const value = String(email || '').trim()
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function openYandexNavigator({ latitude, longitude, address } = {}) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  let url = ''
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    url = `https://yandex.ru/maps/?rtext=~${lat},${lng}`
  } else if (address && String(address).trim()) {
    url = `https://yandex.ru/maps/?text=${encodeURIComponent(String(address).trim())}`
  } else {
    return false
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/** Конвертирует ISO/datetime строку в формат для datetime-local input */
export function toLocalDatetime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}
