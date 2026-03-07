import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Edit, Trash2, X, Save, Search as SearchIcon } from 'lucide-react'
import { Portal } from '../components/Portal'

export function Services() {
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingService, setEditingService] = useState(null)
    const [formData, setFormData] = useState({ name: '', price: 0 })
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadServices()
    }, [])

    const loadServices = async () => {
        try {
            const data = await api.getPredefinedServices()
            setServices(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        try {
            if (editingService) {
                await api.updatePredefinedService(editingService.id, formData)
            } else {
                await api.createPredefinedService(formData)
            }
            setIsModalOpen(false)
            setEditingService(null)
            setFormData({ name: '', price: 0 })
            loadServices()
        } catch (e) {
            alert('Ошибка: ' + e.message)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить эту услугу?')) return
        try {
            await api.deletePredefinedService(id)
            loadServices()
        } catch (e) {
            alert('Ошибка: ' + e.message)
        }
    }

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Список услуг</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>Управление готовыми услугами для быстрого добавления в заявки</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => { setEditingService(null); setFormData({ name: '', price: 0 }); setIsModalOpen(true); }}
                    style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={20} strokeWidth={2.5} /> Добавить услугу
                </button>
            </div>

            <div className="glass" style={{ display: 'flex', gap: '20px', marginBottom: '32px', padding: '24px', borderRadius: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <SearchIcon size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="search"
                        placeholder="Поиск по названию..."
                        style={{ paddingLeft: '50px', width: '100%' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="data-card glass slide-up">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Название услуги</th>
                            <th>Стоимость по умолчанию</th>
                            <th style={{ textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.map(service => (
                            <tr key={service.id}>
                                <td style={{ fontWeight: '600' }}>{service.name}</td>
                                <td>{service.price} ₽</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button className="icon-btn info glass" onClick={() => {
                                            setEditingService(service)
                                            setFormData({ name: service.name, price: service.price })
                                            setIsModalOpen(true)
                                        }}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="icon-btn danger glass" onClick={() => handleDelete(service.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredServices.length === 0 && !loading && (
                    <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Услуги не найдены
                    </div>
                )}
            </div>

            {isModalOpen && (
                <Portal>
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}>
                        <div className="data-card glass animate-fade-in" style={{ 
                            width: '100%', 
                            maxWidth: '500px', 
                            padding: '32px', 
                            borderRadius: '24px',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>{editingService ? 'Редактировать услугу' : 'Новая услуга'}</h3>
                                <button className="icon-btn glass" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="input-group">
                                    <label>Название услуги *</label>
                                    <input 
                                        required 
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Например: Диагностика кондиционера"
                                        autoFocus
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Стоимость по умолчанию (₽) *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        value={formData.price} 
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    <button type="submit" className="btn-primary" style={{ flex: 1, height: '48px' }}>
                                        <Save size={20} style={{ marginRight: '8px' }} /> Сохранить
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn-secondary" 
                                        onClick={() => setIsModalOpen(false)}
                                        style={{ flex: 1, height: '48px' }}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    )
}
