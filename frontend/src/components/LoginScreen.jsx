import React, { useState } from 'react'
import { api } from '../api'
import { validatePhone, formatPhone, normalizePhoneInputRu } from '../lib/utils'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugCode, setDebugCode] = useState('')
  const [step, setStep] = useState('phone')
  const isOnline = useOnlineStatus()

  const handleSendCode = async (e) => {
    e.preventDefault()
    const normalizedPhone = formatPhone(phone)
    if (!isOnline) {
      setError('Нет подключения к интернету')
      return
    }
    if (!validatePhone(normalizedPhone)) {
      setError('Введите номер в формате +7XXXXXXXXXX')
      return
    }
    setLoading(true)
    setError('')
    try {
      setPhone(normalizedPhone)
      const result = await api.sendCode(normalizedPhone)
      if (result.debug_code) setDebugCode(result.debug_code)
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    const normalizedPhone = formatPhone(phone)
    if (!isOnline) {
      setError('Нет подключения к интернету')
      return
    }
    if (!code || code.length < 4) {
      setError('Введите полный код')
      return
    }
    setLoading(true)
    setError('')
    try {
      const tokens = await api.verifyCode(normalizedPhone, code)
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1>❄️ CoolCare</h1>
        <p className="subtitle">Приложение для мастеров</p>
        {!isOnline && (
          <div className="offline-banner">📡 Нет подключения — вход невозможен</div>
        )}
        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="login-form">
            <div className="form-group">
              <label>Номер телефона</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizePhoneInputRu(e.target.value))}
                placeholder="+7 (999) 000-00-00"
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading || !isOnline}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="login-form">
            <div className="form-group">
              <label>Код из SMS</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {debugCode && (
              <div className="debug-code">
                <p>
                  Ваш код: <strong>{debugCode}</strong>
                </p>
              </div>
            )}
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setStep('phone')
                setDebugCode('')
                setCode('')
              }}
            >
              ← Изменить номер
            </button>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading || !isOnline}>
              {loading ? 'Проверка...' : 'Войти'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
