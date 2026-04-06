import { useState } from 'react'

interface SectionListProps {
  title: string
  color: string
  items: string[]
  onAdd: (texto: string) => void
  onRemove: (index: number) => void
  onUpdate: (index: number, texto: string) => void
  placeholder: string
}

export function SectionList({ title, color, items, onAdd, onRemove, onUpdate, placeholder }: SectionListProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  function handleAdd() {
    if (!newItem.trim()) return
    onAdd(newItem.trim())
    setNewItem('')
  }

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditText(items[idx])
  }

  function saveEdit(idx: number) {
    if (editText.trim()) onUpdate(idx, editText.trim())
    setEditingIdx(null)
  }

  return (
    <div style={{
      border: '0.5px solid var(--color-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', border: 'none', background: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
        }}
      >
        <span style={{
          fontSize: 10, transition: 'transform 0.15s', display: 'inline-block',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          color: 'var(--color-text-3)',
        }}>
          ▼
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          {title}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
          background: color + '18', color,
        }}>
          {items.length}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 16px 14px' }}>
          {items.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic', margin: '0 0 10px' }}>
              Nenhum item. Adicione o primeiro criterio.
            </p>
          )}

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 8px', borderRadius: 6,
                  background: 'var(--color-surface)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 18, flexShrink: 0, marginTop: 1 }}>
                  {idx + 1}.
                </span>
                {editingIdx === idx ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(idx)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(idx); if (e.key === 'Escape') setEditingIdx(null) }}
                    style={{
                      flex: 1, fontSize: 13, color: 'var(--color-text)',
                      border: '1px solid var(--color-blue)', borderRadius: 4,
                      padding: '2px 6px', outline: 'none', background: 'var(--color-bg)',
                      fontFamily: 'var(--font-family-sans)',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => startEdit(idx)}
                    style={{ flex: 1, fontSize: 13, color: 'var(--color-text)', cursor: 'text', lineHeight: 1.5 }}
                  >
                    {item}
                  </span>
                )}
                <button
                  onClick={() => onRemove(idx)}
                  className="combinados-remove-btn"
                  style={{
                    width: 22, height: 22, borderRadius: 4, border: 'none',
                    background: 'none', color: 'var(--color-text-3)', cursor: 'pointer',
                    fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
                  }}
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add form */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder={placeholder}
              style={{
                flex: 1, padding: '6px 10px', fontSize: 12,
                border: '1px solid var(--color-border-md)', borderRadius: 6,
                background: 'var(--color-bg)', color: 'var(--color-text)',
                outline: 'none', fontFamily: 'var(--font-family-sans)',
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: newItem.trim() ? color : 'var(--color-border)',
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: newItem.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>
        </div>
      )}
      <style>{`
        .combinados-remove-btn:hover { opacity: 1 !important; color: var(--color-red) !important; }
      `}</style>
    </div>
  )
}
