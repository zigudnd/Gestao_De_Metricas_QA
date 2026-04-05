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
    <div className="mb-6" style={{
      border: '0.5px solid var(--color-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2.5"
        style={{
          padding: '12px 16px', border: 'none', background: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
        }}
      >
        <span className="text-muted" style={{
          fontSize: 10, transition: 'transform 0.15s', display: 'inline-block',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
        <span className="heading-sm">
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
            <p className="text-small text-muted" style={{ fontStyle: 'italic', margin: '0 0 10px' }}>
              Nenhum item. Adicione o primeiro criterio.
            </p>
          )}

          {/* Items list */}
          <div className="flex flex-col gap-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2"
                style={{
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
                    className="input-field flex-1"
                    style={{
                      borderColor: 'var(--color-blue)',
                      padding: '2px 6px',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => startEdit(idx)}
                    className="flex-1" style={{ fontSize: 13, cursor: 'text', lineHeight: 1.5 }}
                  >
                    {item}
                  </span>
                )}
                <button
                  onClick={() => onRemove(idx)}
                  className="combinados-remove-btn btn btn-ghost"
                  style={{
                    width: 22, height: 22, padding: 0,
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
          <div className="flex gap-2 mt-2.5">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder={placeholder}
              className="input-field flex-1"
              style={{ padding: '6px 10px', fontSize: 12 }}
            />
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="btn btn-sm"
              style={{
                background: newItem.trim() ? color : 'var(--color-border)',
                color: '#fff', whiteSpace: 'nowrap',
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
