import { useState, useRef, useEffect } from 'react'
import type { SectionDef, SectionId } from '../types/statusReport.types'
import { SECTION_COLORS } from '../types/statusReport.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'

interface SectionManagerProps {
  sections: SectionDef[]
  onAdd: (section: SectionDef) => void
  onUpdate: (id: SectionId, updates: Partial<SectionDef>) => void
  onRemove: (id: SectionId) => void
  onClose: () => void
}

export function SectionManager({ sections, onAdd, onUpdate, onRemove, onClose }: SectionManagerProps) {
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(SECTION_COLORS[0])
  const [newSide, setNewSide] = useState<'left' | 'right'>('right')
  const [deleteId, setDeleteId] = useState<SectionId | null>(null)
  const [editingId, setEditingId] = useState<SectionId | null>(null)

  function handleAdd() {
    if (!newLabel.trim()) return
    const id = 'sec_' + Date.now()
    onAdd({ id, label: newLabel.trim(), color: newColor, side: newSide })
    setNewLabel('')
  }

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    modalRef.current?.focus()
  }, [])

  const deleteTarget = sections.find((s) => s.id === deleteId)

  return (
    <>
      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        className="modal-backdrop"
      >
        <div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Gerenciar Seções"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          className="modal-container modal-md"
          style={{
            borderTop: '3px solid var(--color-blue)',
            maxHeight: '85vh', overflow: 'hidden',
            outline: 'none',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="heading-sm">
              Gerenciar Seções
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="btn btn-ghost flex items-center justify-center"
              style={{ width: 28, height: 28 }}
            >
              ×
            </button>
          </div>

          {/* Existing sections */}
          <div className="flex-1 mb-4" style={{ overflowY: 'auto' }}>
            <div className="flex flex-col gap-1.5">
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-center gap-2"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--color-surface-2)',
                    borderRadius: 8,
                    borderLeft: `4px solid ${sec.color}`,
                  }}
                >
                  {editingId === sec.id ? (
                    <>
                      <input
                        value={sec.label}
                        onChange={(e) => onUpdate(sec.id, { label: e.target.value })}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        onBlur={() => setEditingId(null)}
                        className="input-field flex-1"
                        style={{ padding: '4px 8px', borderColor: 'var(--color-blue)' }}
                      />
                      <select
                        value={sec.side}
                        onChange={(e) => onUpdate(sec.id, { side: e.target.value as 'left' | 'right' })}
                        className="select-field"
                        style={{ width: 'auto', padding: '4px 6px', fontSize: 11 }}
                      >
                        <option value="left">Esquerda</option>
                        <option value="right">Direita</option>
                      </select>
                      <div className="flex gap-0.5" style={{ flexShrink: 0 }}>
                        {SECTION_COLORS.slice(0, 8).map((c) => (
                          <button
                            key={c}
                            onClick={() => onUpdate(sec.id, { color: c })}
                            aria-label={`Cor ${c}`}
                            aria-pressed={sec.color === c}
                            style={{
                              width: 18, height: 18, borderRadius: 4,
                              background: c, border: sec.color === c ? '2px solid var(--color-text)' : '1px solid transparent',
                              cursor: 'pointer', padding: 0,
                            }}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="heading-sm flex-1">
                        {sec.label}
                      </span>
                      <span className="badge badge-neutral">
                        {sec.side === 'left' ? 'Esq' : 'Dir'}
                      </span>
                      <button
                        onClick={() => setEditingId(sec.id)}
                        title="Editar"
                        aria-label="Editar"
                        className="btn btn-ghost"
                        style={{ width: 24, height: 24, padding: 0 }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteId(sec.id)}
                        title="Excluir"
                        aria-label="Excluir"
                        disabled={sections.length <= 1}
                        className="btn btn-ghost"
                        style={{
                          width: 24, height: 24, padding: 0,
                          opacity: sections.length > 1 ? 1 : 0.3,
                        }}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add new section */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <div className="label-field" style={{ marginBottom: 8 }}>
              Nova seção
            </div>
            <div className="flex gap-2 items-center">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nome da seção"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="input-field flex-1"
              />
              <select
                value={newSide}
                onChange={(e) => setNewSide(e.target.value as 'left' | 'right')}
                className="select-field"
                style={{ width: 'auto', padding: '7px 6px', fontSize: 12 }}
              >
                <option value="left">Esq</option>
                <option value="right">Dir</option>
              </select>
              <div className="flex gap-0.5" style={{ flexShrink: 0 }}>
                {SECTION_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    aria-label={`Cor ${c}`}
                    aria-pressed={newColor === c}
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: c, border: newColor === c ? '2px solid var(--color-text)' : '1px solid transparent',
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!newLabel.trim()}
                className="btn btn-primary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                + Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>

      {deleteId && deleteTarget && (
        <ConfirmModal
          title="Excluir seção"
          description={`Excluir "${deleteTarget.label}"? Os itens desta seção serão movidos para a primeira seção restante.`}
          onConfirm={() => { onRemove(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
