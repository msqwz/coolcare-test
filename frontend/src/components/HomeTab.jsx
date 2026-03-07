import React from 'react'
import { PullToRefreshWrapper } from './PullToRefreshWrapper'
import { JobCard } from './JobCard'
import { ClipboardList, CalendarDays, Wrench, CheckCircle2, TrendingUp, DollarSign, XCircle } from 'lucide-react'

export function HomeTab({ stats, todayJobs, onSelectJob, onAddressClick, onStatusChange, isOnline, onRefresh }) {
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const statCards = [
    { label: 'Всего', value: stats?.total_jobs || 0, icon: ClipboardList, color: '#3b82f6' },
    { label: 'Сегодня', value: stats?.today_jobs || 0, icon: CalendarDays, color: '#10b981' },
    { label: 'В работе', value: stats?.active_jobs || 0, icon: Wrench, color: '#f59e0b' },
    { label: 'Готово', value: stats?.completed_jobs || 0, icon: CheckCircle2, color: '#8b5cf6' },
    { label: 'Отменено', value: stats?.cancelled_jobs || 0, icon: XCircle, color: '#ef4444' },
  ]

  return (
    <PullToRefreshWrapper onRefresh={onRefresh}>
      <div className="tab home-tab animate-fade-in">
        <div className="home-header">
          <div className="header-greeting">
            <h2>Главная</h2>
            <p className="home-date">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          </div>
        </div>

        {!isOnline && (
          <div className="offline-banner">
            📡 Оффлайн — данные из кэша
          </div>
        )}

        {/* Revenue Banner */}
        <div className="revenue-strip">
          <div className="revenue-strip-item">
            <DollarSign size={20} className="revenue-strip-icon" />
            <div className="revenue-strip-info">
              <span className="revenue-strip-label">Сегодня</span>
              <span className="revenue-strip-value">{(stats?.today_revenue || 0).toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
          <div className="revenue-strip-divider" />
          <div className="revenue-strip-item">
            <TrendingUp size={20} className="revenue-strip-icon" />
            <div className="revenue-strip-info">
              <span className="revenue-strip-label">Всего</span>
              <span className="revenue-strip-value">{(stats?.total_revenue || 0).toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </div>

        {/* Stats Horizontal Scroll */}
        <div className="stats-scroll-container">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="stat-chip" style={{ '--chip-color': stat.color }}>
                <div className="stat-chip-icon">
                  <Icon size={18} />
                </div>
                <span className="stat-chip-value">{stat.value}</span>
                <span className="stat-chip-label">{stat.label}</span>
              </div>
            )
          })}
        </div>

        <div className="today-jobs-section">
          <div className="section-header">
            <h3>Заявки на сегодня</h3>
            <span className="section-count">{todayJobs.length}</span>
          </div>

          <div className="today-jobs-list">
            {todayJobs.length === 0 ? (
              <div className="empty-state">
                <CalendarDays size={48} className="empty-icon" />
                <p>На сегодня заявок нет</p>
                <span className="empty-subtext">Отличное время для отдыха или поиска новых клиентов</span>
              </div>
            ) : (
              todayJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onSelectJob(job)}
                  onAddressClick={onAddressClick}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </PullToRefreshWrapper>
  )
}
