import { useState } from 'react'
import type { Cerimonia } from '../../types/squadConfig.types'

interface CeremoniaCardProps {
  cerimonia: Cerimonia
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<Omit<Cerimonia, 'id'>>) => void
}

const inputSm: React.CSSProperties = {
  padding: '4px 8px', fontSize: 12,
  border: '1px solid var(--color-border-md)', borderRadius: 6,
  background: 'var(--color-bg)', color: 'var(--color-text)',
  outline: 'none', fontFamily: 'var(--font-family-sans)',
}

export function CeremoniaCard({ cerimonia, onRemove, onUpdate }: CeremoniaCardProps) {
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(cerimonia.nome)
  const [dia, setDia] = useState(cerimonia.dia)
  const [duracao, setDuracao] = useState(cerimonia.duracao)

  function handleSave() {
    const trimmed = nome.trim()
    if (!trimmed) return
    onUpdate(cerimonia.id, { nome: trimmed, dia: dia.trim(), duracao: duracao.trim() })
    setEditing(false)
  }

  function handleCancel() {
    setNome(cerimonia.nome)
    setDia(cerimonia.dia)
    setDuracao(cerimonia.duracao)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '10px 14px',
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-yellow)',
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input
            value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            style={{ ...inputSm, flex: 2, minWidth: 100 }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
          <input
            value={dia} onChange={(e) => setDia(e.target.value)}
            placeholder="Dia/horario"
            style={{ ...inputSm, flex: 3, minWidth: 140 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
          <input
            value={duracao} onChange={(e) => setDuracao(e.target.value)}
            placeholder="Duracao"
            style={{ ...inputSm, flex: 1, minWidth: 70 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '4px 12px', borderRadius: 5, border: '1px solid var(--color-border)',
              background: 'none', color: 'var(--color-text-2)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!nome.trim()}
            style={{
              padding: '4px 12px', borderRadius: 5, border: 'none',
              background: nome.trim() ? 'var(--color-yellow)' : 'var(--color-border)',
              color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: nome.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          {cerimonia.nome}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
          {cerimonia.dia} · {cerimonia.duracao}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        style={{
          width: 22, height: 22, borderRadius: 4, border: 'none',
          background: 'none', color: 'var(--color-text-3)', cursor: 'pointer',
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-yellow)' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--color-text-3)' }}
        title="Editar"
      >
        &#9998;
      </button>
      <button
        onClick={() => onRemove(cerimonia.id)}
        style={{
          width: 22, height: 22, borderRadius: 4, border: 'none',
          background: 'none', color: 'var(--color-text-3)', cursor: 'pointer',
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-red)' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--color-text-3)' }}
        title="Remover"
      >
        ×
      </button>
    </div>
  )
}
