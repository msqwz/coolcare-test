import React, { useState } from 'react'
import { api } from '../api'

export function Login() {
    const [phone, setPhone] = useState('+7')
    const [code, setCode] = useState('')
    const [step, setStep] = useState(1)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSendCode = async () => {
        setLoading(true)
        setError('')
        try {
            await api.sendCode(phone)
            setStep(2)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await api.verifyCode(phone, code)
            localStorage.setItem('access_token', data.access_token)
            localStorage.setItem('refresh_token', data.refresh_token)

            // Проверка роли
            const user = await api.getCurrentUser()
            if (user.role !== 'admin') {
                throw new Error('Доступ запрещен. Требуется роль администратора.')
            }

            window.location.href = '/admin/'
        } catch (e) {
            setError(e.message)
            localStorage.clear()
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '20px'
        }}>
            <div className="login-box glass animate-fade-in" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '48px',
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'var(--primary)',
                        borderRadius: '20px',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '32px',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                    }}>❄️</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.04em' }}>CoolCare Admin</h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontWeight: '500' }}>Система управления сервисом</p>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        border: '1px solid #fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                {step === 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="input-group">
                            <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', display: 'block' }}>Номер телефона</label>
                            <input
                                type="tel"
                                placeholder="+7 (999) 000-00-00"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '52px',
                                    borderRadius: '14px',
                                    border: '2px solid #e2e8f0',
                                    padding: '0 16px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleSendCode}
                            disabled={loading}
                            style={{ height: '56px', borderRadius: '14px', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loading ? 'Отправка...' : 'Получить код доступа'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="input-group">
                            <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', display: 'block' }}>Код подтверждения</label>
                            <input
                                type="text"
                                placeholder="000 000"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '52px',
                                    borderRadius: '14px',
                                    border: '2px solid #e2e8f0',
                                    padding: '0 16px',
                                    fontSize: '1.2rem',
                                    fontWeight: '800',
                                    textAlign: 'center',
                                    letterSpacing: '0.2em',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleVerify}
                            disabled={loading}
                            style={{ height: '56px', borderRadius: '14px', fontSize: '1rem', fontWeight: '800' }}
                        >
                            {loading ? 'Вход...' : 'Войти в систему'}
                        </button>
                        <button
                            style={{ background: 'none', border: 'none', color: '#64748b', marginTop: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}
                            onClick={() => setStep(1)}
                        >
                            ← Изменить номер
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
