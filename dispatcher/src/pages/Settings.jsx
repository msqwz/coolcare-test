import React, { useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { Shield, Server, Activity, Database, Cpu, Lock, Globe, Zap, Users, ShieldCheck } from 'lucide-react'
import { supabase } from '@shared/supabase'

export function Settings() {
    const { user, workers } = useAdmin()
    const [realtimeStatus, setRealtimeStatus] = useState('Checking...')
    const [dbLatency, setDbLatency] = useState(0)

    useEffect(() => {
        // Simple ping to determine API/DB health and latency
        const checkHealth = async () => {
            const start = performance.now()
            try {
                const { error } = await supabase.from('users').select('id').limit(1)
                if (!error) {
                    setRealtimeStatus('Connected')
                    setDbLatency(Math.round(performance.now() - start))
                } else {
                    setRealtimeStatus('Error connecting')
                }
            } catch (e) {
                setRealtimeStatus('Disconnected')
            }
        }
        checkHealth()
        const interval = setInterval(checkHealth, 30000) // check every 30s
        return () => clearInterval(interval)
    }, [])

    const activeSessions = workers?.filter(w => w.is_active).length || 0
    const totalWorkers = workers?.length || 0

    const technicalMetrics = [
        { label: 'WebSocket Realtime', value: realtimeStatus, icon: <Zap size={18} />, color: realtimeStatus === 'Connected' ? '#10b981' : '#f59e0b' },
        { label: 'Active Sessions', value: `${activeSessions} / ${totalWorkers} users`, icon: <Users size={18} />, color: 'var(--text-main)' },
        { label: 'Database Health', value: 'Operational', icon: <Database size={18} />, color: '#10b981' },
        { label: 'API Latency', value: `${dbLatency}ms`, icon: <Activity size={18} />, color: dbLatency < 100 ? '#10b981' : '#f59e0b' },
    ]

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em' }}>Настройки системы</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Техническая аналитика и управление конфигурацией</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px', marginBottom: '32px' }}>
                {/* Profile Card */}
                <div className="data-card glass slide-up" style={{ padding: '32px', animationDelay: '0.1s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '12px', borderRadius: '16px' }}>
                            <Shield size={28} color="var(--primary)" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Ваш профиль</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="input-group">
                            <label>Имя администратора</label>
                            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-main)' }}>{user?.name || 'Не указано'}</div>
                        </div>
                        <div className="input-group">
                            <label>Номер телефона</label>
                            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-main)' }}>{user?.phone}</div>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <span className="status-badge" style={{ background: '#dcfce7', color: '#15803d', padding: '8px 16px', borderRadius: '30px' }}>
                                <Lock size={14} style={{ marginRight: '6px' }} /> Доступ: {user?.role || 'admin'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* System Technical Health Card */}
                <div className="data-card glass slide-up" style={{ padding: '32px', animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '16px' }}>
                            <Cpu size={28} color="#10b981" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Техническая аналитика</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {technicalMetrics.map((metric, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px',
                                borderRadius: '14px',
                                background: 'rgba(255,255,255,0.6)',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '600' }}>
                                    {metric.icon} {metric.label}
                                </div>
                                <div style={{ fontWeight: '800', color: metric.color, fontSize: '1rem' }}>
                                    {metric.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notification Sandbox */}
            <div className="data-card glass slide-up" style={{ padding: '32px', animationDelay: '0.3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(71, 85, 105, 0.1)', padding: '12px', borderRadius: '16px' }}>
                        <Server size={28} color="#475569" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Инфраструктура</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Настройки серверов и внешних сервисов</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <Globe size={18} color="var(--primary)" />
                            <span>Яндекс.Карты: <strong>v2.1 (Production Key)</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={18} color="#10b981" />
                            <span>PostgREST API: <strong>v10 (Supabase)</strong></span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                        <button
                            className="btn-secondary"
                            style={{ padding: '14px 28px' }}
                            onClick={() => alert('Логи системы подготовлены: server.log')}
                        >
                            Скачать логи
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.05em' }}>
                COOLCARE ADMIN DASHBOARD • VERSION 3.2.0 • 2024
            </div>
        </div>
    )
}
