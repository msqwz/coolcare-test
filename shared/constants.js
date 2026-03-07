export const DEFAULT_CENTER = [47.2357, 39.7015]
export const YANDEX_MAPS_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || 'e1a186ee-6741-4e3f-b7f4-438ed8c61c4b'

export const STATUS_LIST = [
    { key: 'scheduled', label: 'Назначена', color: '#3b82f6' },
    { key: 'active', label: 'В работе', color: '#d97706' },
    { key: 'completed', label: 'Завершено', color: '#16a34a' },
    { key: 'cancelled', label: 'Отменено', color: '#dc2626' },
]

export const PRIORITY_LIST = [
    { key: 'low', label: 'Низкий', color: '#64748b' },
    { key: 'medium', label: 'Средний', color: '#f59e0b' },
    { key: 'high', label: 'Высокий', color: '#ef4444' },
    { key: 'urgent', label: 'Срочный', color: '#b91c1c' },
]

export const JOB_TYPE_LIST = [
    { key: 'repair', label: 'Ремонт' },
    { key: 'installation', label: 'Установка' },
    { key: 'diagnostics', label: 'Диагностика' },
    { key: 'maintenance', label: 'Обслуживание' },
]
