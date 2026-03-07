import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { validateEmail } from '../lib/utils'
import { User, Phone, Mail, Calendar, Bell, LogOut, RotateCcw, Save, X, Edit3 } from 'lucide-react'
import '../styles/Profile.css'

export function ProfileTab({ user, onUpdateUser, onLogout, onResetStats, isOnline }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [pushStatus, setPushStatus] = useState('')

  useEffect(() => {
    setFormData({ name: user?.name || '', email: user?.email || '' })
    setEmailError('')
  }, [user])

  const enablePush = async () => {
    if (!window.isSecureContext) { setPushStatus('no_https'); return }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) { setPushStatus('no_browser'); return }
    setPushStatus('loading')
    try {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { setPushStatus('denied'); return }
      } else if (Notification.permission !== 'granted') { setPushStatus('denied'); return }
      const { vapid_public } = await api.getVapidPublic()
      const reg = await navigator.serviceWorker.ready
      if (!reg.pushManager) { setPushStatus('no_browser'); return }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapid_public })
      await api.pushSubscribe(sub.toJSON())
      setPushStatus('enabled')
    } catch (err) {
      console.error('Push subscribe error:', err)
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('not configured') || msg.includes('503') || msg.includes('push')) setPushStatus('no_server')
      else if (msg.includes('permission') || msg.includes('denied')) setPushStatus('denied')
      else setPushStatus('error')
    }
  }

  const handleSave = async () => {
    if (!isOnline) { setError('Нет подключения к интернету'); return }
    const email = formData.email.trim()
    if (email && !validateEmail(email)) { setEmailError('Введите корректный email'); return }
    setLoading(true); setError(''); setEmailError('')
    try {
      const updated = await api.request('/auth/me', { method: 'PUT', body: JSON.stringify({ ...formData, email }) })
      onUpdateUser(updated)
      setIsEditing(false)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleResetStats = async () => {
    if (!isOnline) { setError('Нет подключения'); return }
    if (!confirm('Сбросить статистику? Будут удалены завершённые и отменённые заявки.')) return
    setLoading(true); setError('')
    try { await onResetStats?.() }
    catch (err) { setError(err.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  const initials = (user?.name || 'U').charAt(0).toUpperCase()

  const pushMessage = {
    no_https: 'Нужен HTTPS',
    no_browser: 'Браузер не поддерживает',
    no_server: 'Сервер не настроен',
    denied: 'Разрешение отклонено',
    error: 'Ошибка',
    enabled: 'Включены ✓',
    loading: 'Настройка...',
  }

  return (
    <div className="tab profile-tab-modern">
      {/* Avatar Header */}
      <div className="profile-avatar-section">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-avatar-info">
          <h2 className="profile-name">{user?.name || 'Мастер'}</h2>
          <span className="profile-role">{user?.role === 'admin' ? 'Администратор' : 'Мастер'}</span>
        </div>
        <button
          className="profile-edit-btn"
          onClick={() => {
            if (isEditing) {
              setFormData({ name: user?.name || '', email: user?.email || '' })
              setIsEditing(false)
            } else {
              setIsEditing(true)
            }
          }}
        >
          {isEditing ? <X size={18} /> : <Edit3 size={18} />}
        </button>
      </div>

      {error && <div className="profile-error">{error}</div>}
      {!isOnline && <div className="profile-offline">Оффлайн</div>}

      {/* Info Card */}
      <div className="profile-card">
        <div className="profile-field">
          <User size={16} className="profile-field-icon" />
          <div className="profile-field-content">
            <span className="profile-field-label">Имя</span>
            {isEditing ? (
              <input
                type="text" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="profile-field-input"
                placeholder="Введите имя"
              />
            ) : (
              <span className="profile-field-value">{user?.name || 'Не указано'}</span>
            )}
          </div>
        </div>

        <div className="profile-field">
          <Phone size={16} className="profile-field-icon" />
          <div className="profile-field-content">
            <span className="profile-field-label">Телефон</span>
            <span className="profile-field-value">{user?.phone}</span>
          </div>
        </div>

        <div className="profile-field">
          <Mail size={16} className="profile-field-icon" />
          <div className="profile-field-content">
            <span className="profile-field-label">Email</span>
            {isEditing ? (
              <>
                <input
                  type="email" value={formData.email}
                  onChange={(e) => {
                    const email = e.target.value
                    setFormData({ ...formData, email })
                    if (!email.trim() || validateEmail(email)) setEmailError('')
                    else setEmailError('Некорректный email')
                  }}
                  className={`profile-field-input ${emailError ? 'input-error' : ''}`}
                  placeholder="Введите email"
                />
                {emailError && <span className="profile-field-error">{emailError}</span>}
              </>
            ) : (
              <span className="profile-field-value">{user?.email || 'Не указано'}</span>
            )}
          </div>
        </div>

        <div className="profile-field">
          <Calendar size={16} className="profile-field-icon" />
          <div className="profile-field-content">
            <span className="profile-field-label">Зарегистрирован</span>
            <span className="profile-field-value">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
            </span>
          </div>
        </div>
      </div>

      {isEditing && (
        <button className="profile-save-btn" onClick={handleSave} disabled={loading || !isOnline || !!emailError}>
          <Save size={16} />
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      )}

      {/* Notifications */}
      <div className="profile-card">
        <div className="profile-field">
          <Bell size={16} className="profile-field-icon" />
          <div className="profile-field-content">
            <span className="profile-field-label">Уведомления</span>
            <span className="profile-field-value">
              {pushStatus && pushMessage[pushStatus] ? pushMessage[pushStatus] : 'Не настроены'}
            </span>
          </div>
          {(!pushStatus || ['no_https', 'no_browser', 'no_server', 'denied', 'error'].includes(pushStatus)) && (
            <button className="profile-inline-btn" onClick={pushStatus ? () => setPushStatus('') : enablePush} disabled={!isOnline}>
              {pushStatus ? 'Повторить' : 'Включить'}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="profile-actions-section">
          <button className="profile-action-btn reset" onClick={handleResetStats} disabled={loading || !isOnline}>
            <RotateCcw size={16} />
            Сбросить статистику
          </button>
          <button className="profile-action-btn logout" onClick={onLogout}>
            <LogOut size={16} />
            Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  )
}
