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
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          ref={modalRef}
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderTop: '3px solid var(--color-blue)',
          borderRadius: 12, padding: 24,
          width: '100%', maxWidth: 520,
          maxHeight: '85vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          outline: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
              Gerenciar Seções
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'var(--color-surface-2)', cursor: 'pointer',
                fontSize: 14, color: 'var(--color-text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {/* Existing sections */}
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
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
                        style={{
                          flex: 1, padding: '4px 8px', borderRadius: 5,
                          border: '1px solid var(--color-blue)', fontSize: 13,
                          fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                          outline: 'none',
                        }}
                      />
                      <select
                        value={sec.side}
                        onChange={(e) => onUpdate(sec.id, { side: e.target.value as 'left' | 'right' })}
                        style={{
                          padding: '4px 6px', borderRadius: 5, fontSize: 11,
                          border: '1px solid var(--color-border-md)',
                          fontFamily: 'var(--font-family-sans)',
                        }}
                      >
                        <option value="left">Esquerda</option>
                        <option value="right">Direita</option>
                      </select>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
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
                      <span style={{
                        flex: 1, fontSize: 13, fontWeight: 600,
                        color: 'var(--color-text)',
                      }}>
                        {sec.label}
                      </span>
                      <span style={{
                        fontSize: 10, color: 'var(--color-text-3)',
                        padding: '2px 6px', borderRadius: 4,
                        background: 'var(--color-surface)',
                      }}>
                        {sec.side === 'left' ? 'Esq' : 'Dir'}
                      </span>
                      <button
                        onClick={() => setEditingId(sec.id)}
                        title="Editar"
                        style={{
                          width: 24, height: 24, borderRadius: 5, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          fontSize: 12, color: 'var(--color-text-3)',
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteId(sec.id)}
                        title="Excluir"
                        disabled={sections.length <= 1}
                        style={{
                          width: 24, height: 24, borderRadius: 5, border: 'none',
                          background: 'transparent', cursor: sections.length > 1 ? 'pointer' : 'not-allowed',
                          fontSize: 12, color: 'var(--color-text-3)',
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
          <div style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>
              Nova seção
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nome da seção"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 7,
                  border: '1px solid var(--color-border-md)', fontSize: 13,
                  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                }}
              />
              <select
                value={newSide}
                onChange={(e) => setNewSide(e.target.value as 'left' | 'right')}
                style={{
                  padding: '7px 6px', borderRadius: 7, fontSize: 12,
                  border: '1px solid var(--color-border-md)',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                <option value="left">Esq</option>
                <option value="right">Dir</option>
              </select>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
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
                style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none',
                  background: newLabel.trim() ? 'var(--color-blue)' : '#ccc',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: newLabel.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-family-sans)',
                  whiteSpace: 'nowrap',
                }}
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
