import React, { useMemo, useState, useEffect } from 'react'
import { PullToRefreshWrapper } from './PullToRefreshWrapper'
import { STATUS_LIST } from '../constants'
import { Icons } from './Icons'

const DAY_TRACKER_STORAGE_KEY = 'coolcare_calendar_day_tracker_v1'
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDateKeyFromIso(isoString) {
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return null
  return toDateKey(dt)
}

function loadDayTracker() {
  try {
    const raw = localStorage.getItem(DAY_TRACKER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function getDayType(date, tracker) {
  const key = toDateKey(date)
  return tracker[key] || (isWeekend(date) ? 'weekend' : 'workday')
}

function getMonthGrid(anchorDate) {
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - mondayOffset)
  const days = []
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    days.push(day)
  }
  return days
}

function getWeekGrid(anchorDate) {
  const d = new Date(anchorDate)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  const days = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    days.push(day)
  }
  return days
}

function getJobsForDate(jobs, date) {
  const ds = toDateKey(date)
  return jobs.filter((j) => j.scheduled_at && toDateKeyFromIso(j.scheduled_at) === ds)
}

export function CalendarTab({ jobs, onSelectJob, onAddressClick, onRefresh }) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [dayTracker, setDayTracker] = useState(loadDayTracker)
  const [viewMode, setViewMode] = useState('month')

  useEffect(() => {
    localStorage.setItem(DAY_TRACKER_STORAGE_KEY, JSON.stringify(dayTracker))
  }, [dayTracker])

  const dayJobs = useMemo(
    () => getJobsForDate(jobs, selectedDate),
    [jobs, selectedDate]
  )

  const monthGrid = useMemo(() => getMonthGrid(currentMonth), [currentMonth])
  const weekGrid = useMemo(() => getWeekGrid(selectedDate), [selectedDate])
  const selectedDayType = getDayType(selectedDate, dayTracker)

  const goPrevMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const goNextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  const goPrevWeek = () => setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))
  const goNextWeek = () => setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))

  const goToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setCurrentMonth(now)
  }

  const monthLabel = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const setSelectedDayType = (type) => {
    const key = toDateKey(selectedDate)
    setDayTracker((prev) => {
      const next = { ...prev }
      if (type === 'auto') delete next[key]
      else next[key] = type
      return next
    })
  }



  return (
    <PullToRefreshWrapper onRefresh={onRefresh}>
      <div className="tab calendar-tab">
        <div className="calendar-header">
          <h2>Календарь</h2>
          <button className="btn-small" onClick={goToday}>Сегодня</button>
        </div>

        <div className="view-mode-toggle">
          <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Месяц</button>
          <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Неделя</button>
        </div>

        {viewMode === 'month' ? (
          <>
            <div className="calendar-nav">
              <button className="btn-calendar-nav" onClick={goPrevMonth} aria-label="Предыдущий месяц">
                {Icons.chevronLeft}
              </button>
              <div className="calendar-date-label">{monthLabel}</div>
              <button className="btn-calendar-nav" onClick={goNextMonth} aria-label="Следующий месяц">
                {Icons.chevronRight}
              </button>
            </div>
            <div className="calendar-month-grid">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="calendar-month-weekday">{day}</div>
              ))}
              {monthGrid.map((date) => {
                const inCurrentMonth = date.getMonth() === currentMonth.getMonth()
                const isToday = toDateKey(date) === toDateKey(new Date())
                const isSelected = toDateKey(date) === toDateKey(selectedDate)
                const dayType = getDayType(date, dayTracker)
                return (
                  <button
                    key={`${date.toISOString()}-cell`}
                    type="button"
                    className={`calendar-month-day ${inCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayType}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>{date.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="calendar-nav">
              <button className="btn-calendar-nav" onClick={goPrevWeek} aria-label="Предыдущая неделя">
                {Icons.chevronLeft}
              </button>
              <div className="calendar-date-label">
                {weekGrid[0].getDate()} {weekGrid[0].toLocaleDateString('ru-RU', { month: 'short' })} — {weekGrid[6].getDate()} {weekGrid[6].toLocaleDateString('ru-RU', { month: 'short' })}
              </div>
              <button className="btn-calendar-nav" onClick={goNextWeek} aria-label="Следующая неделя">
                {Icons.chevronRight}
              </button>
            </div>
            <div className="calendar-week-list">
              {weekGrid.map((date) => {
                const dJobs = getJobsForDate(jobs, date)
                const isToday = toDateKey(date) === toDateKey(new Date())
                const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })
                return (
                  <div key={date.toISOString()} className={`calendar-week-day-block ${isToday ? 'today' : ''}`}>
                    <div className="calendar-week-day-header">{dayName}</div>
                    <div className="calendar-week-day-jobs">
                      {dJobs.length === 0 ? (
                        <p className="empty" style={{ padding: '10px' }}>Нет заявок</p>
                      ) : (
                        dJobs
                          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                          .map((job) => {
                            const st = STATUS_LIST.find((s) => s.key === job.status) || STATUS_LIST[0]
                            const time = job.scheduled_at ? new Date(job.scheduled_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''
                            return (
                              <div
                                key={job.id}
                                className="week-job-compact"
                                onClick={() => onSelectJob(job)}
                              >
                                <span className="week-job-dot" style={{ background: st.color }} />
                                <span className="week-job-name">{job.customer_name || 'Клиент'}</span>
                                {time && <span className="week-job-time">{time}</span>}
                              </div>
                            )
                          })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {viewMode === 'month' && (
          <div className="calendar-day-type-toggle">
            <span className="calendar-day-label-selected">
              {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <div className="calendar-day-type-buttons">
              <button
                type="button"
                className={selectedDayType === 'workday' ? 'active' : ''}
                onClick={() => setSelectedDayType('workday')}
              >
                Рабочий
              </button>
              <button
                type="button"
                className={selectedDayType === 'weekend' ? 'active' : ''}
                onClick={() => setSelectedDayType('weekend')}
              >
                Выходной
              </button>
            </div>
          </div>
        )}
      </div>
    </PullToRefreshWrapper>
  )
}
