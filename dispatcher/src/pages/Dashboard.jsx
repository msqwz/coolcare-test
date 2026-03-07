import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { Briefcase, Activity, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Portal } from '../components/Portal'
import './Dashboard.css'

export function Dashboard() {
    const { stats, jobs, workers } = useAdmin()
    const [period, setPeriod] = useState('month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)

    const calculateJobTotal = (j) => {
        const p = parseFloat(j.price || 0)
        if (p > 0) return p
        return (j.services || []).reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0)
    }

    const getRevenueByPeriod = (p) => {
        const now = new Date()
        let startDate = new Date()
        if (p === 'day') startDate.setHours(0, 0, 0, 0)
        else if (p === 'week') startDate.setDate(now.getDate() - 7)
        else if (p === 'month') startDate.setMonth(now.getMonth(), 1)
        return (jobs || [])
            .filter(j => j.status === 'completed' && j.completed_at && new Date(j.completed_at) >= startDate)
            .reduce((sum, j) => sum + calculateJobTotal(j), 0)
    }

    const typeLabels = {
        repair: 'Ремонт', install: 'Установка', service: 'Обслуживание',
        diagnostic: 'Диагностика', maintenance: 'Тех. обслуживание', other: 'Прочее'
    }
    const typeColors = {
        repair: '#3b82f6', install: '#10b981', service: '#f59e0b',
        diagnostic: '#8b5cf6', maintenance: '#06b6d4', other: '#64748b'
    }

    const masterStats = (workers || []).map(w => {
        const wj = (jobs || []).filter(j => j.user_id === w.id)
        const completed = wj.filter(j => j.status === 'completed')
        const revenue = completed.reduce((sum, j) => sum + calculateJobTotal(j), 0)
        return { ...w, jobCount: wj.length, completedCount: completed.length, revenue }
    }).sort((a, b) => b.revenue - a.revenue)

    const activeJobs = (jobs || []).filter(j => j.status === 'active').length
    const completedJobs = (jobs || []).filter(j => j.status === 'completed').length
    const revenue = getRevenueByPeriod(period)
    const periodLabel = period === 'day' ? 'день' : period === 'week' ? 'неделя' : 'месяц'

    // ===== CALENDAR (untouched logic) =====
    const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = (date) => {
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
        return day === 0 ? 6 : day - 1
    }
    const daysArr = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1)
    const emptyDays = Array.from({ length: firstDayOfMonth(currentDate) }, (_, i) => i)
    const getMastersForDay = (day) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
        return (workers || []).filter(w =>
            (jobs || []).some(j => j.user_id === w.id && new Date(j.scheduled_at).toDateString() === dateStr)
        )
    }
    const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

    return (
        <div className="dash-root animate-fade-in">
            {/* ===== HEADER ===== */}
            <div className="dash-header">
                <h2 className="dash-page-title">Аналитика</h2>
                <div className="dash-period-switcher glass">
                    {['day', 'week', 'month'].map(p => (
                        <button key={p} className={`dash-period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                            {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== COMPACT KPI STRIP ===== */}
            <div className="dash-kpi-strip">
                <div className="dash-kpi-item">
                    <div className="kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Briefcase size={16} /></div>
                    <div className="kpi-data">
                        <span className="kpi-val">{stats?.total_jobs || 0}</span>
                        <span className="kpi-label">Всего</span>
                    </div>
                </div>
                <div className="dash-kpi-item">
                    <div className="kpi-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><Activity size={16} /></div>
                    <div className="kpi-data">
                        <span className="kpi-val">{activeJobs}</span>
                        <span className="kpi-label">В работе</span>
                    </div>
                </div>
                <div className="dash-kpi-item">
                    <div className="kpi-icon" style={{ background: '#f0fdf4', color: '#10b981' }}><Users size={16} /></div>
                    <div className="kpi-data">
                        <span className="kpi-val">{stats?.active_users || 0}</span>
                        <span className="kpi-label">Мастера</span>
                    </div>
                </div>
                <div className="dash-kpi-item">
                    <div className="kpi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><TrendingUp size={16} /></div>
                    <div className="kpi-data">
                        <span className="kpi-val">{revenue.toLocaleString()} ₽</span>
                        <span className="kpi-label">Выручка / {periodLabel}</span>
                    </div>
                </div>
            </div>

            {/* ===== TYPE DISTRIBUTION — compact inline ===== */}
            <div className="dash-types-bar glass">
                {Object.entries(stats?.type_distribution || {}).map(([type, count]) => {
                    const percent = Math.round((count / (stats?.total_jobs || 1)) * 100)
                    const color = typeColors[type] || typeColors.other
                    return (
                        <div key={type} className="type-chip" style={{ '--type-color': color }}>
                            <span className="type-dot" />
                            <span className="type-name">{typeLabels[type] || type}</span>
                            <span className="type-count">{count}</span>
                            <span className="type-pct">{percent}%</span>
                        </div>
                    )
                })}
            </div>

            {/* ===== MAIN GRID: Calendar + Master Stats ===== */}
            <div className="dash-main-grid">
                {/* CALENDAR — unchanged */}
                <div className="data-card glass" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Календарь</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                            <button onClick={() => changeMonth(-1)} className="icon-btn glass" style={{ width: 28, height: 28 }}><ChevronLeft size={14} /></button>
                            <button onClick={() => changeMonth(1)} className="icon-btn glass" style={{ width: 28, height: 28 }}><ChevronRight size={14} /></button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', paddingBottom: '6px' }}>{d}</div>
                        ))}
                        {emptyDays.map(i => <div key={`empty-${i}`} />)}
                        {daysArr.map(day => {
                            const masters = getMastersForDay(day)
                            const count = masters.length
                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate({ day, masters })}
                                    style={{
                                        aspectRatio: '1/1', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        background: count > 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.4)',
                                        borderRadius: '10px', cursor: 'pointer',
                                        border: '1px solid var(--glass-border)', position: 'relative',
                                        transition: 'all 0.2s'
                                    }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{day}</span>
                                    {count > 0 && (
                                        <div style={{
                                            position: 'absolute', bottom: '3px', width: '5px', height: '5px',
                                            borderRadius: '50%', background: 'var(--primary)',
                                            boxShadow: '0 0 5px var(--primary)'
                                        }} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: Masters + Recent */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* MASTER STATS */}
                    <div className="data-card glass" style={{ padding: '20px', flex: 1 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>Мастера</h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {masterStats.map((m, i) => (
                                <div key={m.id} className="dash-master-row">
                                    <span className="master-rank">{i + 1}</span>
                                    <div className="master-avatar" style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--primary)' }}>
                                        {(m.name || 'M')[0]}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || m.phone}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.completedCount} выполнено</div>
                                    </div>
                                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{m.revenue.toLocaleString()} ₽</span>
                                </div>
                            ))}
                            {masterStats.length === 0 && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '16px' }}>Нет данных</div>
                            )}
                        </div>
                    </div>

                    {/* RECENT JOBS */}
                    <div className="data-card glass" style={{ padding: '20px', flex: 1 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>Последние заявки</h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {(jobs || []).slice(0, 6).map(job => {
                                const worker = workers.find(w => w.id === job.user_id)
                                const statusCfg = {
                                    scheduled: { label: 'Ожидает', cls: 'scheduled' },
                                    active: { label: 'В работе', cls: 'active' },
                                    completed: { label: 'Готово', cls: 'completed' },
                                    cancelled: { label: 'Отмена', cls: 'cancelled' },
                                }
                                const sc = statusCfg[job.status] || statusCfg.scheduled
                                return (
                                    <div key={job.id} className="dash-recent-row">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.customer_name || 'Без имени'}</div>
                                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{worker?.name || '—'}</div>
                                        </div>
                                        <span className={`status-badge ${sc.cls}`} style={{ fontSize: '0.62rem', padding: '3px 8px' }}>{sc.label}</span>
                                        <span style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '60px', textAlign: 'right' }}>{calculateJobTotal(job).toLocaleString()} ₽</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* CALENDAR DATE MODAL — unchanged logic */}
            {selectedDate && (
                <Portal>
                    <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
                        <div className="modal-container animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                            <h3 className="modal-title" style={{ marginBottom: '16px' }}>Мастера на {selectedDate.day} число</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedDate.masters.length > 0 ? selectedDate.masters.map(m => (
                                    <div key={m.id} className="checklist-item glass" style={{ background: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                            {(m.name || 'M')[0].toUpperCase()}
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.name || m.phone}</div>
                                    </div>
                                )) : (
                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Нет заявок</div>
                                )}
                            </div>
                            <button className="btn-primary" onClick={() => setSelectedDate(null)} style={{ marginTop: '16px', width: '100%' }}>Закрыть</button>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    )
}
