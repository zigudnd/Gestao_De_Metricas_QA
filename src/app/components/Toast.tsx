import { useEffect, useRef, useState } from 'react'

export interface ToastData {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
  duration?: number
}

let _toastId = 0
let _listeners: Array<(t: ToastData) => void> = []

/** Dispara um toast de qualquer lugar (não precisa de contexto React) */
export function showToast(
  message: string,
  type: ToastData['type'] = 'success',
  opts?: { action?: ToastData['action']; duration?: number },
) {
  const toast: ToastData = {
    id: ++_toastId,
    message,
    type,
    action: opts?.action,
    duration: opts?.duration ?? 3000,
  }
  _listeners.forEach((fn) => fn(toast))
}

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--color-green-light)', color: 'var(--color-green)', border: 'var(--color-green-mid)' },
  error:   { bg: 'var(--color-red-light)',   color: 'var(--color-red)',   border: 'var(--color-red-mid)' },
  info:    { bg: 'var(--color-blue-light)',   color: 'var(--color-blue)',  border: 'var(--color-blue)' },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timeoutIds = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const handler = (t: ToastData) => {
      setToasts((prev) => [...prev, t])
      if (t.duration && t.duration > 0) {
        const tid = setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id))
          timeoutIds.current.delete(t.id)
        }, t.duration)
        timeoutIds.current.set(t.id, tid)
      }
    }
    _listeners.push(handler)
    return () => {
      _listeners = _listeners.filter((fn) => fn !== handler)
      timeoutIds.current.forEach((tid) => clearTimeout(tid))
      timeoutIds.current.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 5000, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type] ?? TYPE_STYLES.info
        return (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              background: s.bg, color: s.color,
              border: `1px solid ${s.border}`,
              borderRadius: 10,
              fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'auto',
              fontFamily: 'var(--font-family-sans)',
              minWidth: 240,
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: s.color, color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
