import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { api } from '../api'
import { Plus, Edit, Trash2, X, Save, Search as SearchIcon, CheckSquare, Square, Trash, PlusCircle, MapPin } from 'lucide-react'
import { PRIORITY_LIST, JOB_TYPE_LIST, STATUS_LIST } from '../constants'
import { Portal } from '../components/Portal'
import { AddressMapModal } from '../components/AddressMapModal'

function JobModal({ job, workers, onClose, onSave }) {
    const [formData, setFormData] = useState(job || {
        customer_name: '',
        title: '',
        description: '',
        notes: '',
        address: '',
        customer_phone: '',
        price: '',
        status: 'scheduled',
        priority: 'medium',
        job_type: 'repair',
        scheduled_at: new Date().toISOString().slice(0, 16),
        services: [],
        user_id: workers && workers.length > 0 ? workers[0].id : ''
    })
    const [predefinedServices, setPredefinedServices] = useState([])
    const [showMap, setShowMap] = useState(false)

    React.useEffect(() => {
        api.getPredefinedServices().then(setPredefinedServices).catch(console.error)
    }, [])

    const calcTotal = (services) => {
        return services.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0)
    }

    const handleSelectPredefined = (serviceId) => {
        if (!serviceId) return
        const service = predefinedServices.find(s => s.id === parseInt(serviceId))
        if (service) {
            const newServices = [...(formData.services || []), { description: service.name, price: service.price, quantity: 1 }]
            setFormData({
                ...formData,
                services: newServices,
                price: calcTotal(newServices)
            })
        }
    }

    const addService = () => {
        const newServices = [...(formData.services || []), { description: '', price: '', quantity: 1 }]
        setFormData({
            ...formData,
            services: newServices,
            price: calcTotal(newServices)
        })
    }

    const handleServiceChange = (index, field, value) => {
        const list = [...(formData.services || [])]
        list[index][field] = value
        setFormData({ ...formData, services: list, price: calcTotal(list) })
    }

    const removeService = (index) => {
        const newServices = (formData.services || []).filter((_, i) => i !== index)
        setFormData({
            ...formData,
            services: newServices,
            price: calcTotal(newServices)
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.user_id) {
            alert('Пожалуйста, выберите мастера')
            return
        }
        const dataToSave = {
            ...formData,
            price: formData.price ? parseFloat(formData.price) : 0,
            user_id: parseInt(formData.user_id) || 0
        }
        onSave(dataToSave)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-container animate-fade-in" style={{ maxHeight: '90vh' }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title">{job ? 'Редактирование' : 'Новая заявка'}</h3>
                        <p className="modal-subtitle">Заполните данные для назначения мастера</p>
                    </div>
                    <button className="icon-btn glass" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Имя клиента</label>
                            <input required placeholder="Иван Иванов" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Телефон клиента</label>
                            <input placeholder="+7 (999) 000-00-00" value={formData.customer_phone || ''} onChange={e => setFormData({ ...formData, customer_phone: e.target.value })} />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Адрес объекта</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input required placeholder="г. Ростов-на-Дону, ул. ..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ flex: 1 }} />
                            <button type="button" className="btn-secondary" onClick={() => setShowMap(true)} style={{ padding: '8px 16px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={16} /> Карта
                            </button>
                        </div>
                    </div>

                    <div className="form-row-3">
                        <div className="input-group">
                            <label>Тема / Неисправность</label>
                            <input required placeholder="Например: Ремонт кондиционера" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Тип работы</label>
                            <select className="admin-select" value={formData.job_type} onChange={e => setFormData({ ...formData, job_type: e.target.value })}>
                                {JOB_TYPE_LIST.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <select className="admin-select" onChange={e => handleSelectPredefined(e.target.value)} value="">
                                    <option value="">Выберите готовую услугу...</option>
                                    {predefinedServices.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.price} ₽)</option>
                                    ))}
                                </select>
                            </div>
                            <button type="button" onClick={addService} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <PlusCircle size={14} /> Произвольная услуга
                            </button>
                        </div>

                        <div className="form-grid" style={{ gap: '8px' }}>
                            {(formData.services || []).map((srv, idx) => (
                                <div key={idx} className="checklist-item glass checklist-grid" style={{ padding: '12px', background: 'white' }}>
                                    <input
                                        className="checklist-input"
                                        placeholder="Название услуги"
                                        value={srv.description}
                                        onChange={e => handleServiceChange(idx, 'description', e.target.value)}
                                    />
                                    <input
                                        className="checklist-input"
                                        type="number"
                                        placeholder="Цена"
                                        value={srv.price}
                                        onChange={e => handleServiceChange(idx, 'price', e.target.value)}
                                        style={{ height: '36px', fontSize: '0.85rem' }}
                                    />
                                    <input
                                        className="checklist-input"
                                        type="number"
                                        placeholder="Кол"
                                        value={srv.quantity}
                                        onChange={e => handleServiceChange(idx, 'quantity', e.target.value)}
                                    />
                                    <button type="button" onClick={() => removeService(idx)} className="icon-btn danger" style={{ background: 'none' }}><Trash size={18} /></button>
                                </div>
                            ))}
                            {(!formData.services || formData.services.length === 0) && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px' }}>Услуги еще не добавлены</div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div className="input-group">
                            <label>Приоритет</label>
                            <select className="admin-select" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                {PRIORITY_LIST.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Цена (₽)</label>
                            <input 
                                type="number" 
                                placeholder="0" 
                                value={formData.price || ''} 
                                onChange={e => setFormData({ ...formData, price: e.target.value })} 
                                disabled={formData.services && formData.services.length > 0}
                                title={formData.services && formData.services.length > 0 ? "Сумма рассчитывается автоматически из списка услуг" : ""}
                                style={formData.services && formData.services.length > 0 ? { backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                            />
                        </div>
                        <div className="input-group">
                            <label>Дата и время</label>
                            <input type="datetime-local" value={formData.scheduled_at ? formData.scheduled_at.slice(0, 16) : ''} onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })} />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Назначить исполнителя</label>
                        <select required className="admin-select" value={formData.user_id} onChange={e => setFormData({ ...formData, user_id: parseInt(e.target.value) })}>
                            <option value="">Выберите мастера...</option>
                            {workers.map(w => (
                                <option key={w.id} value={w.id}>{w.name || w.phone}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <button type="submit" className="btn-primary" style={{ height: '56px', width: '100%' }}>
                            <Save size={20} /> {job ? 'Сохранить изменения' : 'Создать заявку'}
                        </button>
                    </div>
                </form>

                {showMap && (
                    <AddressMapModal
                        address={formData.address}
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        onSelect={(addr, lat, lng) => {
                            setFormData({ ...formData, address: addr, latitude: lat, longitude: lng })
                            setShowMap(false)
                        }}
                        onClose={() => setShowMap(false)}
                    />
                )}
            </div>
        </div>
    )
}

export function Jobs() {
    const { jobs, setJobs, workers, loadData, hasMoreJobs, loadMoreJobs } = useAdmin()
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingJob, setEditingJob] = useState(null)

    const filteredJobs = jobs.filter(job => {
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter
        const matchesSearch = !searchTerm ||
            job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.id.toString().includes(searchTerm)

        return matchesStatus && matchesSearch
    })

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.adminUpdateJob(jobId, { status: newStatus })
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
            loadData()
        } catch (e) {
            alert('Ошибка: ' + e.message)
        }
    }

    const handleSaveJob = async (formData) => {
        try {
            if (editingJob) {
                const updated = await api.adminUpdateJob(editingJob.id, formData)
                setJobs(prev => prev.map(j => j.id === editingJob.id ? updated : j))
            } else {
                const created = await api.adminCreateJob(formData)
                setJobs(prev => [created, ...prev])
            }
            setIsModalOpen(false)
            setEditingJob(null)
            loadData()
        } catch (e) {
            alert('Ошибка при сохранении: ' + e.message)
        }
    }

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Удалить эту заявку?')) return
        try {
            await api.adminDeleteJob(jobId)
            setJobs(prev => prev.filter(j => j.id !== jobId))
            loadData()
        } catch (e) {
            alert('Ошибка: ' + e.message)
        }
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '32px', gap: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Управление заявками</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>Создание, планирование и мониторинг рабочих процессов</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => { setEditingJob(null); setIsModalOpen(true); }}
                    style={{ padding: '12px 24px' }}
                >
                    <Plus size={20} strokeWidth={2.5} /> Создать заявку
                </button>
            </div>

            <div className="glass" style={{ display: 'flex', gap: '20px', marginBottom: '32px', padding: '24px', borderRadius: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <SearchIcon size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="search"
                        placeholder="Поиск по клиенту, адресу или ID..."
                        style={{ paddingLeft: '50px' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Фильтр:</span>
                    <select className="admin-select" style={{ minWidth: '220px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">Все статусы</option>
                        {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="data-card glass slide-up">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Клиент / Тема</th>
                            <th>Адрес объекта</th>
                            <th>Тип / Прогресс</th>
                            <th>Исполнитель</th>
                            <th>Статус</th>
                            <th style={{ textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredJobs.map(job => {
                            const worker = workers.find(w => w.id === job.user_id)
                            const services = job.services || []
                            const totalAmount = job.price || services.reduce((acc, s) => acc + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0)

                            return (
                                <tr key={job.id} style={{ transition: 'background 0.2s' }}>
                                    <td>
                                        <div style={{ fontWeight: '600', fontSize: '1rem' }}>{job.customer_name || 'Без имени'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>#{job.id} • {job.title}</div>
                                    </td>
                                    <td style={{ maxWidth: '220px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400', lineHeight: '1.4' }}>
                                        {job.address}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                            {JOB_TYPE_LIST.find(t => t.key === job.job_type)?.label || job.job_type}
                                        </div>
                                        {services.length > 0 && (
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: '#64748b',
                                                marginTop: '6px',
                                                fontWeight: '800',
                                                background: 'rgba(0,0,0,0.05)',
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '20px'
                                            }}>
                                                услуг: {services.length}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '600' }}>
                                                {(worker?.name || 'M')[0]}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{worker?.name || '-'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <select className={`status-select ${job.status} glass`} value={job.status} onChange={(e) => handleUpdateStatus(job.id, e.target.value)}>
                                            {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                            <button className="icon-btn info glass" onClick={() => { setEditingJob(job); setIsModalOpen(true); }}>
                                                <Edit size={18} />
                                            </button>
                                            <button className="icon-btn danger glass" onClick={() => handleDeleteJob(job.id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filteredJobs.length === 0 && (
                    <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>Ничего не найдено</div>
                        <p style={{ margin: 0 }}>Попробуйте изменить параметры поиска или фильтры</p>
                    </div>
                )}
                {hasMoreJobs && (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <button className="btn-secondary" onClick={loadMoreJobs} style={{ padding: '10px 24px' }}>
                            Загрузить еще
                        </button>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <Portal>
                    <JobModal
                        job={editingJob}
                        workers={workers}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveJob}
                    />
                </Portal>
            )}
        </div>
    )
}
