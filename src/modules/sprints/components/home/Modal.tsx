export interface ModalProps {
  title: string
  onClose: () => void
  danger?: boolean
  children: React.ReactNode
}

export function Modal({
  title,
  onClose,
  danger,
  children,
}: ModalProps) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="modal-backdrop"
    >
      <div className="modal-container modal-md">
        <div className="flex items-center justify-between">
          <h2 className={`heading-md ${danger ? 'text-[var(--color-red)]' : ''}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer border-none bg-none text-xl leading-none px-1 text-[var(--color-text-2)]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
