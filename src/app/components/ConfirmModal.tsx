import { useEffect } from 'react'

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ title, description, confirmLabel = 'Excluir', onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-red)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>🗑️ {title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6 }}>{description}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--color-red)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
