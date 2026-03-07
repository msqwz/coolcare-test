import React from 'react'
import { STATUS_LIST, PRIORITY_LIST, JOB_TYPE_LIST } from '../constants'
import { MapPin, Clock, ExternalLink } from 'lucide-react'

export const JobCard = React.memo(function JobCard({ job, onClick, onAddressClick, onStatusChange }) {
  const statusConfig = STATUS_LIST.find((s) => s.key === job.status) || STATUS_LIST[0]
  const priorityConfig =
    PRIORITY_LIST.find((p) => p.key === (job.priority || 'medium')) || PRIORITY_LIST[1]

  const typeLabel = JOB_TYPE_LIST.find((t) => t.key === job.job_type)?.label || 'Заявка'
  const calculatedPrice = (job.price || (job.services || []).reduce((acc, s) => acc + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0))
  const isLocked = job.status === 'completed' || job.status === 'cancelled'

  return (
    <div className="job-card-modern" onClick={onClick}>
      <div className="job-card-header-modern">
        <div className="job-card-tags-modern">
          <span
            className="job-card-tag-modern"
            style={{ backgroundColor: statusConfig.color + '15', color: statusConfig.color, border: `1px solid ${statusConfig.color}40` }}
          >
            {statusConfig.label}
          </span>
          <span
            className="job-card-tag-modern"
            style={{ backgroundColor: priorityConfig.color + '15', color: priorityConfig.color, border: `1px solid ${priorityConfig.color}40` }}
          >
            {priorityConfig.label}
          </span>
        </div>
        <span className="job-card-type-modern">{typeLabel}</span>
      </div>

      <h3 className="job-card-title-modern">{job.customer_name || 'Клиент не указан'}</h3>

      <div className="job-card-info-modern">
        <div className="job-card-info-row-modern">
          <MapPin size={15} className="job-card-info-icon-modern" />
          {job.address ? (
            <a
              href="#"
              className="job-card-address-link"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAddressClick?.(job)
              }}
            >
              {job.address}
              <ExternalLink size={12} className="address-link-arrow" />
            </a>
          ) : (
            <span className="job-card-info-text-modern">Адрес не указан</span>
          )}
        </div>

        {job.scheduled_at && (
          <div className="job-card-info-row-modern">
            <Clock size={15} className="job-card-info-icon-modern" />
            <span className="job-card-info-text-modern">
              {new Date(job.scheduled_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Status Action Buttons — inside the card */}
      {onStatusChange && (
        <div className="job-card-status-section">
          <span className="status-section-label">Статус:</span>
          <div className="job-card-status-buttons">
            {STATUS_LIST.map((s) => {
              const isActive = job.status === s.key
              const isDisabled = isLocked && !isActive
              return (
                <button
                  key={s.key}
                  className={`status-btn ${isActive ? 'status-btn-active' : ''} ${isDisabled ? 'status-btn-disabled' : ''} ${isLocked && isActive ? 'status-btn-locked' : ''}`}
                  style={{
                    '--btn-color': s.color,
                    borderColor: isActive ? s.color : 'var(--border-color)',
                    backgroundColor: isActive ? s.color + '12' : 'transparent',
                    color: isActive ? s.color : 'var(--text-muted, #6b7280)',
                  }}
                  disabled={isLocked}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isLocked && !isActive) {
                      onStatusChange(job.id, s.key)
                    }
                  }}
                >
                  <span className="status-btn-dot" style={{ background: s.color }} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="job-card-footer-modern">
        <div className="job-card-price-modern">
          <span className="price-label">Стоимость:</span>
          <span className="price-value">{calculatedPrice.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.job.id === nextProps.job.id &&
         prevProps.job.status === nextProps.job.status &&
         prevProps.job.priority === nextProps.job.priority &&
         prevProps.job.price === nextProps.job.price &&
         (prevProps.job.services?.length || 0) === (nextProps.job.services?.length || 0)
})
