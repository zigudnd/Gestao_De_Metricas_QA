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

const TYPE_MAP: Record<string, string> = {
  success: 'msg-success',
  error:   'msg-error',
  info:    'msg-info',
}

const TYPE_BTN_BG: Record<string, string> = {
  success: 'var(--color-green)',
  error:   'var(--color-red)',
  info:    'var(--color-blue)',
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
    <div
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[5000] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const cls = TYPE_MAP[t.type] ?? TYPE_MAP.info
        return (
          <div
            key={t.id}
            className={`${cls} flex items-center gap-[10px] font-semibold shadow-lg pointer-events-auto min-w-[240px]`}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }}
                className="btn btn-sm whitespace-nowrap"
                style={{ background: TYPE_BTN_BG[t.type], color: '#fff' }}
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
