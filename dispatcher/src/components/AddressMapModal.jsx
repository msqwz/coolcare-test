import React, { useState, useEffect, useRef } from 'react'
import { X, MapPin, Check } from 'lucide-react'
import { Portal } from './Portal'

const ROSTOV_CENTER = [47.2357, 39.7015]

export function AddressMapModal({ address, latitude, longitude, onSelect, onClose }) {
    const initLat = latitude || ROSTOV_CENTER[0]
    const initLng = longitude || ROSTOV_CENTER[1]
    const [selectedAddress, setSelectedAddress] = useState(address || '')
    const [selectedLat, setSelectedLat] = useState(initLat)
    const [selectedLng, setSelectedLng] = useState(initLng)
    const mapRef = useRef(null)
    const mapInstance = useRef(null)
    const placemarkRef = useRef(null)

    useEffect(() => {
        const initMap = () => {
            if (!mapRef.current || mapInstance.current) return
            mapInstance.current = new window.ymaps.Map(mapRef.current, {
                center: [initLat, initLng],
                zoom: latitude ? 15 : 12,
                controls: ['zoomControl'],
            })
            placemarkRef.current = new window.ymaps.Placemark(
                [initLat, initLng],
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
        }

        if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(initMap)
        }
    }, [])

    return (
        <Portal>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                    <div className="modal-header">
                    <div>
                        <h3 className="modal-title">Адрес на карте</h3>
                        <p className="modal-subtitle">Нажмите на карту или перетащите метку</p>
                    </div>
                    <button className="icon-btn glass" onClick={onClose}><X size={20} /></button>
                </div>

                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(37, 99, 235, 0.05)',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                }}>
                    <MapPin size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedAddress || 'Адрес не выбран'}
                    </span>
                </div>

                <div ref={mapRef} style={{
                    width: '100%',
                    height: '400px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                }} />

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() => onSelect(selectedAddress, selectedLat, selectedLng)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Check size={18} /> Выбрать адрес
                    </button>
                </div>
            </div>
            </div>
        </Portal>
    )
}
