import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { api } from '../api'
import { Search, UserCheck, UserX, Shield, ShieldOff, Trash2, Plus, X, Save } from 'lucide-react'
import { Portal } from '../components/Portal'

export function Workers() {
    const { workers, setWorkers } = useAdmin()
    const [searchTerm, setSearchTerm] = useState('')
    const [loadingId, setLoadingId] = useState(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [formData, setFormData] = useState({ name: '', phone: '', role: 'master' })

    const filteredWorkers = (workers || []).filter(w =>
        (w.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        w.phone.includes(searchTerm)
    )

    const handleToggleActive = async (worker) => {
        try {
            setLoadingId(worker.id)
            const newStatus = !worker.is_active
            await api.updateWorker(worker.id, { is_active: newStatus })
            setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, is_active: newStatus } : w))
        } catch (e) {
            alert('Ошибка: ' + e.message)
        } finally {
            setLoadingId(null)
        }
    }

    const handleToggleRole = async (worker) => {
        try {
            const newRole = worker.role === 'admin' ? 'master' : 'admin'
            if (!window.confirm(`Вы уверены, что хотите сделать пользователя ${newRole === 'admin' ? 'АДМИНИСТРАТОРОМ' : 'МАСТЕРОМ'}?`)) return

            setLoadingId(worker.id)
            await api.updateWorker(worker.id, { role: newRole })
            setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, role: newRole } : w))
        } catch (e) {
            alert('Ошибка: ' + e.message)
        } finally {
            setLoadingId(null)
        }
    }

    const handleDeleteWorker = async (worker) => {
        if (!window.confirm(`Вы действительно хотите БЕЗВОЗВРАТНО УДАЛИТЬ пользователя ${worker.name || worker.phone}?`)) return
        try {
            setLoadingId(worker.id)
            await api.deleteWorker(worker.id)
            setWorkers(prev => prev.filter(w => w.id !== worker.id))
        } catch (e) {
            alert('Ошибка при удалении: ' + e.message)
        } finally {
            setLoadingId(null)
        }
    }

    const handleAddSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoadingId('new')
            let phone = formData.phone
            if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '')

            const newWorker = await api.createWorker({ ...formData, phone })
            setWorkers(prev => [newWorker, ...prev])
            setIsAddModalOpen(false)
            setFormData({ name: '', phone: '', role: 'master' })
        } catch (e) {
            alert('Ошибка при создании: ' + e.message)
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Управление мастерами</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>Контроль доступа и управление ролями персонала</p>
                    </div>
                </div>
                <button
                    className="btn-primary"
                    style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <Plus size={20} /> Добавить мастера
                </button>
            </div>

            <div className="glass" style={{ padding: '24px', borderRadius: '20px', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="search"
                        placeholder="Поиск по имени или телефону..."
                        style={{ paddingLeft: '50px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>
                    Всего: <strong>{workers?.length || 0}</strong>
                </div>
            </div>

            <div className="data-card glass slide-up">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Сотрудник</th>
                            <th>Контакты</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th style={{ textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredWorkers.map(w => (
                            <tr key={w.id} style={{ transition: 'background 0.2s', opacity: loadingId === w.id ? 0.5 : 1 }}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '700',
                                            color: '#475569'
                                        }}>
                                            {(w.name || 'M')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>{w.name || 'Не указано'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{w.id} • Регистрация {new Date(w.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ fontWeight: '500' }}>{w.phone}</td>
                                <td>
                                    <span style={{
                                        padding: '6px 12px',
                                        borderRadius: '30px',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        background: w.role === 'admin' ? '#fef3c7' : '#eff6ff',
                                        color: w.role === 'admin' ? '#92400e' : '#1d4ed8',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {w.role === 'admin' ? 'Админ' : 'Мастер'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{
                                        color: w.is_active ? '#10b981' : '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '0.9rem',
                                        fontWeight: '700'
                                    }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: w.is_active ? '#10b981' : '#ef4444', boxShadow: w.is_active ? '0 0 8px #10b981' : 'none' }}></div>
                                        {w.is_active ? 'Активен' : 'Заблокирован'}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button
                                            className={`icon-btn ${w.role === 'admin' ? 'warning' : 'info'} glass`}
                                            title={w.role === 'admin' ? 'Сделать мастером' : 'Сделать админом'}
                                            onClick={() => handleToggleRole(w)}
                                            disabled={loadingId === w.id}
                                        >
                                            {w.role === 'admin' ? <ShieldOff size={18} /> : <Shield size={18} />}
                                        </button>
                                        <button
                                            className={`icon-btn ${w.is_active ? 'warning' : 'success'} glass`}
                                            title={w.is_active ? 'Заблокировать' : 'Разблокировать'}
                                            onClick={() => handleToggleActive(w)}
                                            disabled={loadingId === w.id}
                                        >
                                            {w.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                        </button>
                                        <button
                                            className="icon-btn danger glass"
                                            title="Удалить"
                                            onClick={() => handleDeleteWorker(w)}
                                            disabled={loadingId === w.id}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredWorkers.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Сотрудники не найдены
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <Portal>
                    <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                        <div className="modal-container animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <div>
                                    <h3 className="modal-title">Новый сотрудник</h3>
                                    <p className="modal-subtitle">Добавление мастера или диспетчера</p>
                                </div>
                                <button className="icon-btn glass" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                                <div className="input-group">
                                    <label>Имя сотрудника</label>
                                    <input
                                        type="text"
                                        placeholder="Например: Иван Иванов"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Телефон</label>
                                    <input
                                        type="tel"
                                        placeholder="+7 (999) 000-00-00"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Роль</label>
                                    <select
                                        className="admin-select"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        style={{ width: '100%', marginTop: '8px' }}
                                    >
                                        <option value="master">Мастер</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ height: '52px', marginTop: '10px' }}
                                    disabled={loadingId === 'new'}
                                >
                                    {loadingId === 'new' ? 'Добавление...' : <><Save size={20} /> Сохранить</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    )
}
