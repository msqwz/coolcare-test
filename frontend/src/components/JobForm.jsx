import React, { useState } from 'react'
import { api } from '../api'
import { cacheJob, addToSyncQueue } from '../offlineStorage'
import { validatePhone } from '../lib/utils'
import { PRIORITY_LIST, JOB_TYPE_LIST } from '../constants'
import { Icons } from './Icons'
import { AddressMapModal } from './Map/AddressMapModal'

export function JobForm({ onClose, onCreated, isOnline }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    description: '',
    notes: '',
    address: '',
    customer_phone: '',
    scheduled_at: '',
    price: '',
    status: 'scheduled',
    priority: 'medium',
    job_type: 'repair',
    latitude: null,
    longitude: null,
    services: [],
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!formData.customer_name.trim()) newErrors.customer_name = 'Введите имя клиента'
    if (!formData.address.trim()) newErrors.address = 'Введите адрес'
    if (formData.customer_phone && !validatePhone(formData.customer_phone))
      newErrors.customer_phone = 'Неверный номер'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const submitData = { ...formData }
      if (submitData.scheduled_at)
        submitData.scheduled_at = new Date(submitData.scheduled_at).toISOString()
      if (isOnline) {
        await api.createJob(submitData)
      } else {
        const tempJob = {
          ...submitData,
          id: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 0,
          _offline: true,
        }
        await cacheJob(tempJob)
        await addToSyncQueue({ type: 'CREATE_JOB', data: submitData })
      }
      onCreated()
    } catch (err) {
      alert('Ошибка создания: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSelect = (address, lat, lng) => {
    setFormData({ ...formData, address, latitude: lat, longitude: lng })
    setShowMap(false)
  }

  return (
    <div className="job-form-page">
      {!isOnline && (
        <div className="offline-banner">📡 Оффлайн — заявка синхронизируется позже</div>
      )}
      <form className="job-form-full" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Имя клиента *</label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            placeholder="Иван Иванов"
            className={errors.customer_name ? 'error' : ''}
            required
          />
          {errors.customer_name && (
            <span className="field-error">{errors.customer_name}</span>
          )}
        </div>
        <div className="form-group">
          <label>Адрес *</label>
          <div className="address-input-group">
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="ул. Пушкинская, 10"
              className={errors.address ? 'error' : ''}
              required
            />
            <button className="btn-map-select" type="button" onClick={() => setShowMap(true)}>
              📍
            </button>
          </div>
          {errors.address && <span className="field-error">{errors.address}</span>}
        </div>
        <div className="form-group">
          <label>Заметки</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Комментарии к заявке"
            rows={2}
          />
        </div>
        <div className="form-group">
          <label>Телефон клиента</label>
          <input
            type="tel"
            value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            placeholder="+7 (999) 000-00-00"
            className={errors.customer_phone ? 'error' : ''}
          />
          {errors.customer_phone && (
            <span className="field-error">{errors.customer_phone}</span>
          )}
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
            placeholder="Описание работ"
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
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? 'Создание...'
              : isOnline
                ? 'Создать заявку'
                : 'Создать (оффлайн)'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </form>
      {showMap && (
        <AddressMapModal
          address={formData.address}
          latitude={formData.latitude}
          longitude={formData.longitude}
          onSelect={handleAddressSelect}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  )
}
