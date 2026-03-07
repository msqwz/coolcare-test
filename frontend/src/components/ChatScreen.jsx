import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'

export function ChatScreen({ user, onClose }) {
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const scrollRef = useRef(null)
    const pollRef = useRef(null)

    const loadMessages = async () => {
        try {
            const data = await api.request('/chat/messages')
            setMessages(data)
        } catch (e) {
            console.error('Chat load error:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMessages()
        // Polling every 5 seconds
        pollRef.current = setInterval(loadMessages, 5000)
        return () => clearInterval(pollRef.current)
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        const trimmed = text.trim()
        if (!trimmed || sending) return

        setSending(true)
        setText('')
        // Optimistic
        const optimistic = {
            id: Date.now(),
            sender_id: user?.id,
            sender_role: 'master',
            receiver_id: 0,
            text: trimmed,
            created_at: new Date().toISOString(),
            _pending: true,
        }
        setMessages(prev => [...prev, optimistic])

        try {
            await api.request('/chat/messages', {
                method: 'POST',
                body: JSON.stringify({ text: trimmed }),
            })
            loadMessages()
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
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    }

    // Group messages by date
    const groupedMessages = []
    let lastDate = ''
    messages.forEach(m => {
        const dateKey = m.created_at?.slice(0, 10)
        if (dateKey !== lastDate) {
            groupedMessages.push({ type: 'date', date: m.created_at })
            lastDate = dateKey
        }
        groupedMessages.push({ type: 'message', ...m })
    })

    return (
        <div className="chat-screen">
            <div className="chat-header">
                <button className="chat-back-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                </button>
                <div className="chat-header-info">
                    <div className="chat-header-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    </div>
                    <div>
                        <div className="chat-header-name">Поддержка</div>
                        <div className="chat-header-status">Администрация CoolCare</div>
                    </div>
                </div>
            </div>

            <div className="chat-messages" ref={scrollRef}>
                {loading ? (
                    <div className="chat-loading">Загрузка сообщений...</div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">💬</div>
                        <div className="chat-empty-title">Начните диалог</div>
                        <div className="chat-empty-text">Напишите сообщение администратору</div>
                    </div>
                ) : (
                    groupedMessages.map((item, i) => {
                        if (item.type === 'date') {
                            return <div key={`d-${i}`} className="chat-date-divider">{formatDate(item.date)}</div>
                        }
                        const isMine = item.sender_role === 'master'
                        return (
                            <div key={item.id} className={`chat-bubble ${isMine ? 'mine' : 'theirs'} ${item._pending ? 'pending' : ''}`}>
                                <div className="chat-bubble-text">{item.text}</div>
                                <div className="chat-bubble-time">
                                    {formatTime(item.created_at)}
                                    {isMine && item.is_read && <span className="chat-read-mark">✓✓</span>}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="chat-input-area">
                <textarea
                    className="chat-input"
                    rows="1"
                    placeholder="Сообщение..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
            </div>
        </div>
    )
}
