'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
interface ToastCtx { toast: (message: string, type?: Toast['type']) => void }
const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const colors = { success: 'var(--mint)', error: 'var(--rose)', info: 'var(--accent)' }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ color: colors[t.type], fontWeight: 700 }}>{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
