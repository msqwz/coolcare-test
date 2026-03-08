import React, { useState } from 'react'
import { PullToRefreshWrapper } from './PullToRefreshWrapper'
import { JobCard } from './JobCard'
import { filterJobs } from '../lib/filterJobs'
import { JOB_TYPE_LIST } from '../constants'

export function JobsTab({ onSelectJob, onAddressClick, onShowForm, onStatusChange, jobs, hasMoreJobs, loadMoreJobs, onRefresh }) {
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [jobTypeFilter, setJobTypeFilter] = useState('')
  const filteredJobs = filterJobs(jobs, {
    search,
    status: filter,
    jobType: jobTypeFilter || undefined,
  })

  return (
    <PullToRefreshWrapper onRefresh={onRefresh}>
      <div className="tab jobs-tab">
        <div className="tab-header">
          <h2>Заявки</h2>
          <button className="btn-primary btn-add" onClick={onShowForm}>
            + Новая
          </button>
        </div>
        <div className="jobs-search">
          <input
            type="search"
            placeholder="Поиск: имя, адрес (ул./улица, д./дом), тип..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="jobs-search-input"
          />
          <select
            className="jobs-type-filter"
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
          >
            <option value="">Все типы</option>
            {JOB_TYPE_LIST.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-bar">
          <button className={filter === '' ? 'active' : ''} onClick={() => setFilter('')}>
            Все
          </button>
          <button
            className={filter === 'scheduled' ? 'active' : ''}
            onClick={() => setFilter('scheduled')}
          >
            Ожидают
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            В работе
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Завершены
          </button>
          <button
            className={filter === 'cancelled' ? 'active' : ''}
            onClick={() => setFilter('cancelled')}
          >
            Отменены
          </button>
        </div>
        <div className="jobs-list">
          {filteredJobs.length === 0 ? (
            <p className="empty">Нет заявок</p>
          ) : (
            filteredJobs.map((job) => (
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
        
        {hasMoreJobs && jobs.length > 0 && (
          <div className="load-more-container" style={{ textAlign: 'center', margin: '16px 0' }}>
            <button 
              className="btn-secondary" 
              onClick={loadMoreJobs}
              style={{ width: '100%', padding: '12px' }}
            >
              Загрузить еще
            </button>
          </div>
        )}
      </div>
    </PullToRefreshWrapper>
  )
}
