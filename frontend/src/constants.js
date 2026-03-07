export const DEFAULT_CENTER = [47.2357, 39.7015]
export const YANDEX_MAPS_KEY =
  import.meta.env.VITE_YANDEX_MAPS_API_KEY || 'e1a186ee-6741-4e3f-b7f4-438ed8c61c4b'

export const STATUS_LIST = [
  { key: 'scheduled', label: 'Назначена', color: '#0066cc' },
  { key: 'active', label: 'В работе', color: '#28a745' },
  { key: 'completed', label: 'Выполнена', color: '#6c757d' },
  { key: 'cancelled', label: 'Отменена', color: '#dc3545' },
]

export const PRIORITY_LIST = [
  { key: 'low', label: 'Низкий', color: '#dfe6e9' },
  { key: 'medium', label: 'Средний', color: '#ffeaa7' },
  { key: 'high', label: 'Высокий', color: '#fdcb6e' },
  { key: 'urgent', label: 'Срочный', color: '#fab1a0' },
]

export const JOB_TYPE_LIST = [
  { key: 'repair', label: 'Ремонт' },
  { key: 'installation', label: 'Установка' },
  { key: 'diagnostics', label: 'Диагностика' },
  { key: 'maintenance', label: 'Обслуживание' },
]
