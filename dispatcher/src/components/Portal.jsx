import React from 'react'
import ReactDOM from 'react-dom'

export function Portal({ children }) {
    const modalRoot = document.getElementById('modal-root')
    if (!modalRoot) return null
    return ReactDOM.createPortal(children, modalRoot)
}
