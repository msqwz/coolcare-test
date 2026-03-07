import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { Send, User, Clock, ChevronRight, MessageSquare } from 'lucide-react'
import './Chat.css'

export function Chat() {
    const [conversations, setConversations] = useState([])
    const [activeUser, setActiveUser] = useState(null)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const scrollRef = useRef(null)
    const pollRef = useRef(null)

    const loadConversations = async () => {
        try {
            const data = await api.getChatConversations()
            setConversations(data)
        } catch (e) {
            console.error('Failed to load conversations', e)
        } finally {
            setLoading(false)
        }
    }

    const loadMessages = async (userId) => {
        if (!userId) return
        try {
            const data = await api.getChatWithUser(userId)
            setMessages(data)

            // Сбрасываем счетчик непрочитанных для этого юзера
            setConversations(prev => prev.map(c =>
                c.user_id === userId ? { ...c, unread_count: 0 } : c
            ))
        } catch (e) {
            console.error('Failed to load messages', e)
        }
    }

    useEffect(() => {
        loadConversations()
        pollRef.current = setInterval(() => {
            loadConversations()
            if (activeUser) {
                loadMessages(activeUser.user_id)
            }
        }, 5000)

        return () => clearInterval(pollRef.current)
    }, [activeUser])

    useEffect(() => {
        if (activeUser) {
            loadMessages(activeUser.user_id)
        } else {
            setMessages([])
        }
    }, [activeUser])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        const trimmed = text.trim()
        if (!trimmed || sending || !activeUser) return

        setSending(true)
        setText('')

        // Optimistic update
        const optimistic = {
            id: Date.now(),
            sender_id: 0, // admin doesn't matter much for display
            sender_role: 'admin',
            receiver_id: activeUser.user_id,
            text: trimmed,
            created_at: new Date().toISOString(),
            _pending: true,
        }
        setMessages(prev => [...prev, optimistic])

        try {
            await api.sendChatMessage({ text: trimmed, receiver_id: activeUser.user_id })
            await loadMessages(activeUser.user_id)
            await loadConversations() // update last message in list
        } catch (e) {
            console.error('Send error:', e)
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const formatTime = (dt) => {
        if (!dt) return ''
        const d = new Date(dt)
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    const formatDate = (dt) => {
        if (!dt) return ''
        const d = new Date(dt)
        const today = new Date()
        if (d.toDateString() === today.toDateString()) return 'Сегодня'
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) return 'Вчера'
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }

    return (
        <div className="admin-page animate-fade-in">
            <div className="dash-header">
                <div>
                    <h2 className="dash-page-title">Чат с мастерами</h2>
                    <p className="dash-page-subtitle">Поддержка и коммуникация с исполнителями</p>
                </div>
            </div>

            <div className="chat-container glass">
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <div className="chat-sidebar-header">
                        <MessageSquare size={18} />
                        <h3>Диалоги</h3>
                    </div>

                    <div className="chat-conv-list">
                        {loading ? (
                            <div className="chat-empty">Загрузка...</div>
                        ) : conversations.length === 0 ? (
                            <div className="chat-empty">Нет активных диалогов</div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.user_id}
                                    className={`chat-conv-item ${activeUser?.user_id === conv.user_id ? 'active' : ''}`}
                                    onClick={() => setActiveUser(conv)}
                                >
                                    <div className="chat-avatar">
                                        {(conv.name || 'М')[0].toUpperCase()}
                                    </div>
                                    <div className="chat-conv-info">
                                        <div className="chat-conv-name">
                                            <span>{conv.name}</span>
                                            <span className="chat-conv-time">{formatDate(conv.last_message_at)}</span>
                                        </div>
                                        <div className="chat-conv-last">
                                            <span className="chat-conv-text">{conv.last_message}</span>
                                            {conv.unread_count > 0 && (
                                                <span className="chat-conv-badge">{conv.unread_count}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="chat-main">
                    {!activeUser ? (
                        <div className="chat-placeholder">
                            <MessageSquare size={48} color="var(--border-color)" />
                            <h2>Выберите диалог</h2>
                            <p>Выберите мастера из списка слева, чтобы начать общение</p>
                        </div>
                    ) : (
                        <>
                            <div className="chat-main-header">
                                <div className="chat-avatar">
                                    {(activeUser.name || 'М')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="chat-main-name">{activeUser.name}</div>
                                    <div className="chat-main-phone">{activeUser.phone}</div>
                                </div>
                            </div>

                            <div className="chat-messages scrollbar" ref={scrollRef}>
                                {messages.map((m, i) => {
                                    const showDate = i === 0 || new Date(m.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
                                    const isAdmin = m.sender_role === 'admin'

                                    return (
                                        <React.Fragment key={m.id || i}>
                                            {showDate && (
                                                <div className="chat-date-divider">
                                                    <span>{formatDate(m.created_at)}</span>
                                                </div>
                                            )}
                                            <div className={`chat-bubble-wrapper ${isAdmin ? 'admin' : 'master'}`}>
                                                <div className={`chat-bubble ${m._pending ? 'pending' : ''}`}>
                                                    <div className="chat-bubble-text">{m.text}</div>
                                                    <div className="chat-bubble-time">
                                                        {formatTime(m.created_at)}
                                                        {isAdmin && m.is_read && <span className="chat-read-mark">✓✓</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                            </div>

                            <div className="chat-input-wrapper">
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Введите сообщение..."
                                    rows={1}
                                    className="chat-textarea"
                                />
                                <button
                                    className="chat-send-btn"
                                    onClick={handleSend}
                                    disabled={!text.trim() || sending}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
