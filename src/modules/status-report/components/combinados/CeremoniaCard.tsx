import { useState } from 'react'
import type { Cerimonia } from '../../types/squadConfig.types'

interface CeremoniaCardProps {
  cerimonia: Cerimonia
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<Omit<Cerimonia, 'id'>>) => void
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
      <div className="card-sm flex flex-col gap-1.5" style={{
        border: '0.5px solid var(--color-yellow)',
      }}>
        <div className="flex gap-1.5 flex-wrap">
          <input
            value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            className="input-field"
            style={{ flex: 2, minWidth: 100, padding: '4px 8px', fontSize: 12 }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
          <input
            value={dia} onChange={(e) => setDia(e.target.value)}
            placeholder="Dia/horário"
            className="input-field"
            style={{ flex: 3, minWidth: 140, padding: '4px 8px', fontSize: 12 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
          <input
            value={duracao} onChange={(e) => setDuracao(e.target.value)}
            placeholder="Duração"
            className="input-field"
            style={{ flex: 1, minWidth: 70, padding: '4px 8px', fontSize: 12 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
        </div>
        <div className="flex gap-1.5 justify-end">
          <button onClick={handleCancel} className="btn btn-outline btn-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!nome.trim()}
            className="btn btn-sm"
            style={{
              background: nome.trim() ? 'var(--color-yellow)' : 'var(--color-border)',
              color: '#fff',
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-sm flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="heading-sm" style={{ fontSize: 13 }}>
          {cerimonia.nome}
        </div>
        <div className="text-small" style={{ marginTop: 2 }}>
          {[cerimonia.dia, cerimonia.duracao].filter(Boolean).join(' · ')}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="cerimonia-edit-btn btn btn-ghost"
        style={{
          width: 22, height: 22, padding: 0,
          flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
        }}
        title="Editar"
      >
        &#9998;
      </button>
      <button
        onClick={() => onRemove(cerimonia.id)}
        className="cerimonia-delete-btn btn btn-ghost"
        style={{
          width: 22, height: 22, padding: 0,
          flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
        }}
        title="Remover"
      >
        ×
      </button>
      <style>{`
        .cerimonia-edit-btn:hover { opacity: 1 !important; color: var(--color-yellow) !important; }
        .cerimonia-delete-btn:hover { opacity: 1 !important; color: var(--color-red) !important; }
      `}</style>
    </div>
  )
}
