import React, { useEffect, useRef, useState } from 'react'
import { loadYandexMaps } from './loadYandexMaps'
import { DEFAULT_CENTER, STATUS_LIST, JOB_TYPE_LIST } from '../../constants'
import { Calendar, Map as MapIcon, Ghost, Filter } from 'lucide-react'

function toDateStr(d) {
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function MapTab({ jobs }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [routeDate, setRouteDate] = useState(() => toDateStr(new Date()))
  const [activeTypes, setActiveTypes] = useState(() => JOB_TYPE_LIST.map((t) => t.key))
  const [showFilters, setShowFilters] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    loadYandexMaps().then(() => {
      if (!mapRef.current || mapInstance.current) return
      mapInstance.current = new window.ymaps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 11,
        controls: ['zoomControl', 'fullscreenControl'],
      })
      setIsMapReady(true)
    })
  }, [])

  const toggleType = (key) => {
    setActiveTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const jobsWithCoords = jobs.filter((j) => {
    if (!j.latitude || !j.longitude) return false
    if (!j.scheduled_at) return false
    const jobDate = toDateStr(new Date(j.scheduled_at))
    if (jobDate !== routeDate) return false
    if (!activeTypes.includes(j.job_type || 'repair')) return false
    return true
  })

  const todayCount = jobsWithCoords.length

  useEffect(() => {
    if (!mapInstance.current) return
    mapInstance.current.geoObjects.removeAll()

    jobsWithCoords.forEach((job) => {
      const statusColor = STATUS_LIST.find((s) => s.key === job.status)?.color || '#3b82f6'
      const typeLabel = JOB_TYPE_LIST.find((t) => t.key === job.job_type)?.label || 'Заявка'
      const statusLabel = STATUS_LIST.find((s) => s.key === job.status)?.label || ''
      const scheduledTime = job.scheduled_at ? new Date(job.scheduled_at).toLocaleString('ru-RU', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      }) : ''

      const routeUrl = `https://yandex.ru/maps/?rtext=~${job.latitude},${job.longitude}&rtt=auto`

      const placemark = new window.ymaps.Placemark(
        [job.latitude, job.longitude],
        {
          balloonContentHeader: `<strong style="font-size:1em;color:#1f2937;">${job.customer_name || 'Заявка'}</strong>`,
          balloonContentBody: `
            <div style="font-family:-apple-system,sans-serif;padding:4px 0;">
              <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0;"></span>
                <span style="color:${statusColor};font-size:0.75rem;font-weight:700;">${statusLabel}</span>
                <span style="color:#9ca3af;font-size:0.72rem;">·</span>
                <span style="color:#6b7280;font-size:0.72rem;font-weight:600;">${typeLabel}</span>
              </div>
              ${job.address ? `<div style="color:#374151;font-size:0.82rem;margin-bottom:4px;">${job.address}</div>` : ''}
              ${scheduledTime ? `<div style="color:#9ca3af;font-size:0.78rem;margin-bottom:10px;">${scheduledTime}</div>` : ''}
              <a href="${routeUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#3b82f6;color:white;border-radius:10px;text-decoration:none;font-size:0.8rem;font-weight:700;">
                Маршрут →
              </a>
            </div>
          `,
        },
        {
          preset: 'islands#blueCircleDotIcon',
          iconColor: statusColor,
        }
      )

      mapInstance.current.geoObjects.add(placemark)
    })

    if (jobsWithCoords.length > 1) {
      mapInstance.current.setBounds(mapInstance.current.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 50,
      })
    } else if (jobsWithCoords.length === 1) {
      mapInstance.current.setCenter([jobsWithCoords[0].latitude, jobsWithCoords[0].longitude], 14)
    }
  }, [jobsWithCoords, isMapReady])

  return (
    <div className="tab map-tab-modern animate-fade-in">
      <div className="map-header-modern">
        <div className="map-title-row">
          <MapIcon size={22} className="map-title-icon" />
          <h2>Карта</h2>
          <span className="map-stats-modern">{todayCount}</span>
        </div>

        <div className="map-controls-row">
          <div className="map-route-controls-modern">
            <Calendar size={16} className="map-date-icon" />
            <input
              type="date"
              value={routeDate}
              onChange={(e) => setRouteDate(e.target.value)}
              className="map-date-input-modern"
            />
          </div>

          <button
            className={`map-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            <span>Фильтр</span>
          </button>
        </div>

        {showFilters && (
          <div className="map-type-filters">
            {JOB_TYPE_LIST.map((type) => (
              <button
                key={type.key}
                className={`map-type-chip ${activeTypes.includes(type.key) ? 'chip-active' : 'chip-inactive'}`}
                onClick={() => toggleType(type.key)}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="map-wrapper-modern">
        <div ref={mapRef} className="map-container-modern" />

        {jobsWithCoords.length === 0 && (
          <div className="map-empty-overlay">
            <div className="map-empty-content">
              <Ghost size={40} className="map-empty-icon" />
              <h3>Пустая карта</h3>
              <p>Нет заявок с координатами на {routeDate.split('-').reverse().join('.')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
