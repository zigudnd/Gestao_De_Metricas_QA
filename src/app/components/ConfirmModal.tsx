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
      className="modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-container modal-sm"
        style={{ borderTop: '3px solid var(--color-red)' }}
      >
        <div className="heading-sm">🗑️ {title}</div>
        <div className="text-body">{description}</div>
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={onCancel} className="btn btn-outline btn-md">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn btn-danger btn-md">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
