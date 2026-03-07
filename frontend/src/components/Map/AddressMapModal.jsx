import React, { useState, useEffect, useRef } from 'react'
import { loadYandexMaps } from './loadYandexMaps'
import { DEFAULT_CENTER } from '../../constants'

export function AddressMapModal({ address, latitude, longitude, onSelect, onClose }) {
  const initLat = latitude || DEFAULT_CENTER[0]
  const initLng = longitude || DEFAULT_CENTER[1]
  const [selectedAddress, setSelectedAddress] = useState(address || '')
  const [selectedLat, setSelectedLat] = useState(initLat)
  const [selectedLng, setSelectedLng] = useState(initLng)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const placemarkRef = useRef(null)

  useEffect(() => {
    loadYandexMaps().then(() => {
      if (!mapRef.current || mapInstance.current) return
      mapInstance.current = new window.ymaps.Map(mapRef.current, {
        center: [selectedLat, selectedLng],
        zoom: 14,
        controls: ['zoomControl', 'fullscreenControl'],
      })
      placemarkRef.current = new window.ymaps.Placemark(
        [selectedLat, selectedLng],
        { balloonContent: selectedAddress || 'Точка' },
        { draggable: true, preset: 'islands#blueCircleDotIcon' }
      )
      mapInstance.current.geoObjects.add(placemarkRef.current)
      const updateAddress = (coords) => {
        setSelectedLat(coords[0])
        setSelectedLng(coords[1])
        window.ymaps.geocode(coords).then((res) => {
          const first = res.geoObjects.get(0)
          if (first) setSelectedAddress(first.getAddressLine())
        })
      }
      placemarkRef.current.events.add('dragend', () =>
        updateAddress(placemarkRef.current.geometry.getCoordinates())
      )
      mapInstance.current.events.add('click', (e) => {
        const coords = e.get('coords')
        placemarkRef.current.geometry.setCoordinates(coords)
        updateAddress(coords)
      })
    })
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Адрес на карте</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="map-modal-body">
          <div className="selected-address-display">
            <span>📍 {selectedAddress || 'Нажмите на карту или перетащите метку'}</span>
            <span className="coords-display">
              {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
            </span>
          </div>
          <div ref={mapRef} className="map-select-container" />
          <div className="map-modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button
              className="btn-primary"
              onClick={() => onSelect(selectedAddress, selectedLat, selectedLng)}
            >
              Выбрать
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
