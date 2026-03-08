import React, { useState } from 'react'
import { api } from '../api'
import {
  cacheJob,
  removeCachedJob,
  addToSyncQueue,
} from '../offlineStorage'
import {
  STATUS_LIST,
  PRIORITY_LIST,
  JOB_TYPE_LIST,
} from '../constants'
import { toLocalDatetime } from '../lib/utils'
import { Icons } from './Icons'
import { AddressMapModal } from './Map/AddressMapModal'

const JOB_STATUS_TIMES_STORAGE_KEY = 'coolcare_job_status_times_v1'
const CANCEL_REASONS = [
  'Клиент отказался',
  'Нет доступа к объекту',
  'Нет нужной детали',
  'Дубликат заявки',
  'Другое',
]

function loadStatusTimes() {
  try {
    const raw = localStorage.getItem(JOB_STATUS_TIMES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveStatusTimes(data) {
  localStorage.setItem(JOB_STATUS_TIMES_STORAGE_KEY, JSON.stringify(data))
}

function formatDuration(from, to) {
  if (!from || !to) return ''
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} ч ${minutes} мин`
  return `${minutes} мин`
}

function formatTimeRange(from, to) {
  if (!from || !to) return ''
  const fromStr = new Date(from).toLocaleString('ru-RU')
  const toStr = new Date(to).toLocaleString('ru-RU')
  return `${fromStr} — ${toStr}`
}

export function JobDetail({ job, onClose, onUpdate, onDelete, onAddressClick, isOnline }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: job.customer_name || '',
    description: job.description || '',
    notes: job.notes || '',
    address: job.address || '',
    customer_phone: job.customer_phone || '',
    scheduled_at: job.scheduled_at ? toLocalDatetime(job.scheduled_at) : '',
    price: job.price || '',
    latitude: job.latitude,
    longitude: job.longitude,
    status: job.status || 'scheduled',
    priority: job.priority || 'medium',
    job_type: job.job_type || 'repair',
    services: job.services || [],
  })
  const [showMap, setShowMap] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [cancelReasonCustom, setCancelReasonCustom] = useState('')
  const [statusTimes, setStatusTimes] = useState(loadStatusTimes)

  const handleStatusChange = async (newStatus, options = {}) => {
    if (newStatus === job.status) return
    setLoading(true)
    const nowIso = new Date().toISOString()
    const effectiveCancelReason =
      options.cancelReason === 'Другое' ? options.cancelReasonCustom?.trim() : options.cancelReason
    const updateData = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? nowIso : null,
    }
    if (newStatus === 'cancelled' && effectiveCancelReason) {
      const currentNotes = (formData.notes || '').trim()
      const reasonLine = `Причина отмены: ${effectiveCancelReason}`
      updateData.notes = currentNotes ? `${currentNotes}\n${reasonLine}` : reasonLine
    }
    const nextStatusTimes = { ...statusTimes }
    const currentJobTimes = nextStatusTimes[job.id] || {}
    if (newStatus === 'active') {
      currentJobTimes.activeAt = currentJobTimes.activeAt || nowIso
    }
    if (newStatus === 'completed') {
      currentJobTimes.activeAt = currentJobTimes.activeAt || job.scheduled_at || nowIso
      currentJobTimes.completedAt = nowIso
    }
    if (Object.keys(currentJobTimes).length > 0) {
      nextStatusTimes[job.id] = currentJobTimes
      setStatusTimes(nextStatusTimes)
      saveStatusTimes(nextStatusTimes)
    }
    try {
      if (isOnline) {
        const updated = await api.updateJob(job.id, updateData)
        onUpdate(updated)
        cacheJob(updated)
      } else {
        await addToSyncQueue({ type: 'UPDATE_JOB', jobId: job.id, data: updateData })
        const updated = { ...job, ...updateData }
        onUpdate(updated)
        cacheJob(updated)
      }
      setFormData((prev) => ({ ...prev, status: newStatus, notes: updateData.notes ?? prev.notes }))
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddService = () => {
    setFormData({
      ...formData,
      services: [...(formData.services || []), { description: '', price: '', quantity: 1 }],
    })
  }

  const handleServiceChange = (index, field, value) => {
    const newServices = [...(formData.services || [])]
    newServices[index][field] = value
    const total = newServices.reduce(
      (acc, curr) => acc + (parseFloat(curr.price) || 0) * (parseInt(curr.quantity) || 1),
      0
    )
    setFormData({ ...formData, services: newServices, price: total || '' })
  }

  const handleRemoveService = (index) => {
    const newServices = [...(formData.services || [])]
    newServices.splice(index, 1)
    const total = newServices.reduce(
      (acc, curr) => acc + (parseFloat(curr.price) || 0) * (parseInt(curr.quantity) || 1),
      0
    )
    setFormData({ ...formData, services: newServices, price: total || '' })
  }

  const handleSave = async () => {
    setLoading(true)
    const saveData = { ...formData }
    if (saveData.scheduled_at)
      saveData.scheduled_at = new Date(saveData.scheduled_at).toISOString()
    try {
      if (isOnline) {
        const updated = await api.updateJob(job.id, saveData)
        onUpdate(updated)
        cacheJob(updated)
      } else {
        await addToSyncQueue({ type: 'UPDATE_JOB', jobId: job.id, data: saveData })
        const updated = { ...job, ...saveData }
        onUpdate(updated)
        cacheJob(updated)
      }
      setIsEditing(false)
    } catch (err) {
      alert('Ошибка сохранения: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить заявку?')) return
    try {
      if (isOnline) {
        await api.deleteJob(job.id)
      } else {
        await addToSyncQueue({ type: 'DELETE_JOB', jobId: job.id })
      }
      removeCachedJob(job.id)
      onClose()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddressSelect = (address, lat, lng) => {
    setFormData({ ...formData, address, latitude: lat, longitude: lng })
    setShowMap(false)
  }
  const statusConfig = STATUS_LIST.find((s) => s.key === formData.status) || STATUS_LIST[0]
  const priorityConfig =
    PRIORITY_LIST.find((p) => p.key === formData.priority) || PRIORITY_LIST[1]
  const completedFrom = statusTimes[job.id]?.activeAt || job.scheduled_at
  const completedTo = statusTimes[job.id]?.completedAt || job.completed_at
  const completedDuration = formatDuration(completedFrom, completedTo)
  const completedRange = formatTimeRange(completedFrom, completedTo)

  return (
    <div className="job-detail-page">
      {!isOnline && (
        <div className="offline-banner">📡 Оффлайн — изменения синхронизируются позже</div>
      )}
      <div className="job-detail-header">
        <div className="job-detail-tags">
          <span
            className="job-detail-tag"
            style={{ backgroundColor: statusConfig.color + '20', color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
          <span
            className="job-detail-tag"
            style={{ backgroundColor: priorityConfig.color + '40', color: priorityConfig.color }}
          >
            {priorityConfig.label}
          </span>
        </div>
        <span className="job-detail-type">
          {JOB_TYPE_LIST.find((t) => t.key === formData.job_type)?.label || 'Заявка'}
        </span>
      </div>

      {isEditing ? (
        <div className="job-detail-form">
          <div className="form-group">
            <label>Имя клиента *</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Иван Иванов"
              required
            />
          </div>
          <div className="form-group">
            <label>Адрес *</label>
            <div className="address-input-group">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Введите адрес"
                required
              />
              <button className="btn-map-select" onClick={() => setShowMap(true)} type="button">
                📍 Карта
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Заметки</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Комментарии"
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Телефон клиента</label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Приоритет</label>
            <div className="dropdown-wrapper">
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="dropdown-select"
              >
                {PRIORITY_LIST.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="dropdown-icon">{Icons.chevron}</span>
            </div>
          </div>
          <div className="form-group">
            <label>Тип заявки</label>
            <div className="dropdown-wrapper">
              <select
                value={formData.job_type}
                onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                className="dropdown-select"
              >
                {JOB_TYPE_LIST.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="dropdown-icon">{Icons.chevron}</span>
            </div>
          </div>
          <div className="form-group">
            <label>Дата и время</label>
            <input
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              min="2024-01-01T00:00"
              max="2030-12-31T23:59"
            />
          </div>
          <div className="form-group">
            <label>Описание работ</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Услуги (чек-лист)</label>
            <div className="services-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(formData.services || []).map((srv, idx) => (
                <div key={idx} className="service-item-edit" style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <input
                    type="text"
                    placeholder="Название"
                    value={srv.description}
                    onChange={(e) => handleServiceChange(idx, 'description', e.target.value)}
                    style={{ flex: 2, minWidth: '100px', fontSize: '14px', padding: '10px' }}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Цена"
                    value={srv.price}
                    onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                    style={{ flex: 1, minWidth: '60px', fontSize: '14px', padding: '10px' }}
                    min="0"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Кол-во"
                    value={srv.quantity}
                    onChange={(e) => handleServiceChange(idx, 'quantity', e.target.value)}
                    style={{ width: '60px', flexShrink: 0, fontSize: '14px', padding: '10px' }}
                    min="1"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveService(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', fontSize: '20px', padding: '5px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={handleAddService}
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
              >
                + Добавить услугу
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Общая цена (₽)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
              min="0"
              disabled={formData.services && formData.services.length > 0}
              title={formData.services && formData.services.length > 0 ? "Сумма рассчитывается автоматически из списка услуг" : ""}
              style={formData.services && formData.services.length > 0 ? { backgroundColor: 'var(--bg-color)', cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
            />
            {formData.services && formData.services.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Цена рассчитывается автоматически из услуг
              </div>
            )}
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button className="btn-secondary" onClick={() => setIsEditing(false)}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="job-detail-content">
          <h2 className="job-detail-title">{job.customer_name || 'Клиент'}</h2>
          <div className="job-detail-section">
            <h3 className="job-detail-section-title">Информация</h3>
            <div className="job-detail-row">
              <span className="job-detail-label">📍 Адрес:</span>
              {job.address ? (
                <button
                  type="button"
                  className="job-detail-value job-address-link"
                  onClick={onAddressClick}
                >
                  {job.address}
                </button>
              ) : (
                <span className="job-detail-value">Не указан</span>
              )}
            </div>
            {job.notes && (
              <div className="job-detail-row">
                <span className="job-detail-label">📝 Заметки:</span>
                <span className="job-detail-value">{job.notes}</span>
              </div>
            )}
            {job.customer_phone && (
              <div className="job-detail-row">
                <span className="job-detail-label">📞 Телефон:</span>
                <a
                  href={`tel:${job.customer_phone}`}
                  className="job-detail-value"
                  style={{ color: 'var(--primary-color)' }}
                >
                  {job.customer_phone}
                </a>
              </div>
            )}
            {job.scheduled_at && (
              <div className="job-detail-row">
                <span className="job-detail-label">📅 Дата:</span>
                <span className="job-detail-value">
                  {new Date(job.scheduled_at).toLocaleString('ru-RU')}
                </span>
              </div>
            )}
          </div>
          {job.description && (
            <div className="job-detail-section">
              <h3 className="job-detail-section-title">Описание</h3>
              <p className="job-detail-description">{job.description}</p>
            </div>
          )}
          {job.services && job.services.length > 0 && (
            <div className="job-detail-section">
              <h3 className="job-detail-section-title">Услуги</h3>
              <div className="job-detail-services" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {job.services.map((srv, idx) => (
                  <div key={idx} className="job-detail-service-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '600' }}>{srv.description}</span>
                      <span style={{ fontSize: '12px', color: 'var(--gray-color)' }}>{srv.quantity} шт. × {srv.price} ₽</span>
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                      {(parseFloat(srv.price) || 0) * (parseInt(srv.quantity) || 1)} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {job.price && (
            <div className="job-detail-section">
              <h3 className="job-detail-section-title">Стоимость</h3>
              <div className="job-detail-row">
                <span className="job-detail-label">💰 Цена:</span>
                <span className="job-detail-value job-detail-price">{job.price} ₽</span>
              </div>
            </div>
          )}
          {job.status === 'completed' && completedRange && (
            <div className="job-detail-section">
              <h3 className="job-detail-section-title">Время выполнения</h3>
              <div className="job-detail-row">
                <span className="job-detail-label">🕒 Интервал:</span>
                <span className="job-detail-value">{completedRange}</span>
              </div>
              {completedDuration && (
                <div className="job-detail-row">
                  <span className="job-detail-label">⏱ Длительность:</span>
                  <span className="job-detail-value">{completedDuration}</span>
                </div>
              )}
            </div>
          )}
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <div className="job-detail-section">
              <h3 className="job-detail-section-title">Статус</h3>
              <div className="status-buttons">
                {STATUS_LIST.filter((s) => s.key !== 'cancelled').map((status, i) => (
                  <button
                    key={status.key}
                    className={`status-btn ${i <= STATUS_LIST.filter((s) => s.key !== 'cancelled').findIndex((s) => s.key === job.status) ? 'active' : ''} ${i === STATUS_LIST.filter((s) => s.key !== 'cancelled').findIndex((s) => s.key === job.status) ? 'current' : ''}`}
                    style={{ '--status-color': status.color }}
                    onClick={() => handleStatusChange(status.key)}
                    disabled={
                      i < STATUS_LIST.filter((s) => s.key !== 'cancelled').findIndex((s) => s.key === job.status) || loading
                    }
                  >
                    <span className="status-btn-icon">
                      {i < STATUS_LIST.filter((s) => s.key !== 'cancelled').findIndex((s) => s.key === job.status)
                        ? '✓'
                        : i === STATUS_LIST.filter((s) => s.key !== 'cancelled').findIndex((s) => s.key === job.status)
                          ? '●'
                          : '○'}
                    </span>
                    <span className="status-btn-label">{status.label}</span>
                  </button>
                ))}
              </div>
              <button
                className="btn-cancel-status"
                onClick={() => setShowCancelDialog(true)}
                disabled={loading}
              >
                Отменить заявку
              </button>
            </div>
          )}
          <div className="job-detail-actions">
            <button className="btn-edit-full" onClick={() => setIsEditing(true)}>
              ✏️ Редактировать
            </button>
            <button className="btn-delete-full" onClick={handleDelete}>
              🗑 Удалить
            </button>
          </div>
        </div>
      )}
      {showMap && (
        <AddressMapModal
          address={formData.address}
          latitude={formData.latitude}
          longitude={formData.longitude}
          onSelect={handleAddressSelect}
          onClose={() => setShowMap(false)}
        />
      )}
      {showCancelDialog && (
        <div className="modal-overlay" onClick={() => setShowCancelDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Причина отмены</h2>
              <button type="button" className="btn-close" onClick={() => setShowCancelDialog(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Выберите причину</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="dropdown-select"
                >
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              {cancelReason === 'Другое' && (
                <div className="form-group">
                  <label>Описание причины</label>
                  <textarea
                    value={cancelReasonCustom}
                    onChange={(e) => setCancelReasonCustom(e.target.value)}
                    rows={3}
                    placeholder="Опишите причину"
                  />
                </div>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    if (cancelReason === 'Другое' && !cancelReasonCustom.trim()) {
                      alert('Укажите причину отмены')
                      return
                    }
                    setShowCancelDialog(false)
                    await handleStatusChange('cancelled', {
                      cancelReason,
                      cancelReasonCustom,
                    })
                  }}
                >
                  Подтвердить отмену
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCancelDialog(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
