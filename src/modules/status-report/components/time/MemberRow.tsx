import { useState } from 'react'
import type { MembroTime } from '../../types/squadConfig.types'

interface MemberRowProps {
  membro: MembroTime
  onRemove?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<MembroTime>) => void
}

const PAPEL_CORES: Record<string, { bg: string; text: string }> = {
  'Dev Mobile iOS':     { bg: 'var(--color-blue-light)', text: 'var(--color-blue-text)' },
  'Dev Mobile Android': { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
  'Dev Backend':        { bg: 'var(--color-amber-light)', text: 'var(--color-amber)' },
  'Dev BFF':            { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
  'QA':                 { bg: 'var(--color-blue-light)', text: 'var(--color-blue)' },
  'Tech Lead':          { bg: 'var(--color-red-light)', text: 'var(--color-red)' },
  'Scrum Master':       { bg: 'var(--color-red-light)', text: 'var(--color-red)' },
  'Product Owner':      { bg: 'var(--color-amber-light)', text: 'var(--color-amber)' },
  'Designer':           { bg: 'var(--color-surface-2)', text: 'var(--color-text-2)' },
}

const FALLBACK_CORES = [
  { bg: 'var(--color-blue-light)', text: 'var(--color-blue-text)' },
  { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
  { bg: 'var(--color-amber-light)', text: 'var(--color-amber)' },
  { bg: 'var(--color-blue-light)', text: 'var(--color-blue)' },
  { bg: 'var(--color-red-light)', text: 'var(--color-red)' },
]

const ROLE_LABEL: Record<string, string> = {
  qa_lead: 'QA Lead', qa: 'QA', stakeholder: 'Stakeholder',
}

const MOTIVOS = ['Rotação', 'Reforço', 'Suporte técnico', 'Cobertura de férias']

function getCorPapel(papel: string, id: string): { bg: string; text: string } {
  if (PAPEL_CORES[papel]) return PAPEL_CORES[papel]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_CORES[hash % FALLBACK_CORES.length]
}

function getIniciais(nome: string): string {
  if (!nome.trim()) return '??'
  const parts = nome.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

export function MemberRow({ membro, onRemove, onUpdate }: MemberRowProps) {
  const cor = getCorPapel(membro.papel || membro.squadRole || '', membro.id)
  const isTemp = membro.tipo === 'temporario'
  const [showStatusEdit, setShowStatusEdit] = useState(false)
  const [motivo, setMotivo] = useState(membro.motivo || '')
  const [periodoInicio, setPeriodoInicio] = useState(membro.periodoInicio || '')
  const [periodoFim, setPeriodoFim] = useState(membro.periodoFim || '')

  function saveStatus() {
    if (onUpdate) {
      onUpdate(membro.id, {
        motivo: motivo || undefined,
        periodoInicio: periodoInicio || undefined,
        periodoFim: periodoFim || undefined,
      })
    }
    setShowStatusEdit(false)
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderLeft: isTemp ? '3px solid var(--color-amber-mid)' : '0.5px solid var(--color-border)',
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Main row */}
      <div className="flex items-center gap-2.5" style={{ padding: '8px 12px' }}>
        {/* Avatar */}
        <div className="flex items-center justify-center" style={{
          width: 32, height: 32, borderRadius: '50%',
          background: cor.bg, color: cor.text,
          border: `0.5px solid ${cor.text}20`,
          fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          {getIniciais(membro.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {membro.nome}
            </span>
            {membro.papel && (
              <span className="badge" style={{
                color: cor.text, background: cor.bg,
              }}>
                {membro.papel}
              </span>
            )}
            {membro.squadRole && (
              <span className="badge badge-neutral">
                {ROLE_LABEL[membro.squadRole] || membro.squadRole}
              </span>
            )}
            {isTemp && (
              <span className="badge badge-amber">
                Temporário
              </span>
            )}
          </div>
          {/* Segunda linha */}
          <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
            {membro.email && (
              <span className="text-small text-muted">{membro.email}</span>
            )}
            {membro.motivo && (
              <span className="text-small text-muted">· {membro.motivo}</span>
            )}
            {membro.periodoInicio && membro.periodoFim && (
              <span className="text-small text-muted">
                · {membro.periodoInicio.split('-').reverse().slice(0, 2).join('/')} — {membro.periodoFim.split('-').reverse().slice(0, 2).join('/')}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isTemp && onUpdate && (
          <button
            onClick={() => setShowStatusEdit(!showStatusEdit)}
            className="btn btn-sm"
            style={{
              background: showStatusEdit ? 'var(--color-blue-light)' : 'none',
              color: showStatusEdit ? 'var(--color-blue)' : 'var(--color-text-3)',
              border: 'none',
            }}
          >
            {showStatusEdit ? 'Fechar' : 'Status'}
          </button>
        )}
        {isTemp && onRemove && (
          <>
            <button
              onClick={() => onRemove(membro.id)}
              className="time-member-remove btn btn-ghost"
              style={{
                width: 22, height: 22, padding: 0,
                flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
              }}
              title="Remover membro temporario"
              aria-label="Remover membro temporario"
            >
              ×
            </button>
            <style>{`
              .time-member-remove:hover { opacity: 1 !important; color: var(--color-red) !important; }
            `}</style>
          </>
        )}
      </div>

      {/* Status edit panel (expandível) */}
      {showStatusEdit && (
        <div style={{
          borderTop: '0.5px solid var(--color-border)',
          padding: '10px 12px',
          background: 'var(--color-bg)',
        }}>
          <div className="flex gap-2.5 flex-wrap mb-2.5">
            <div className="flex-1" style={{ minWidth: 140 }}>
              <label className="section-label">Motivo</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="input-field">
                <option value="">Sem motivo</option>
                {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1" style={{ minWidth: 120 }}>
              <label className="section-label">Período início</label>
              <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="input-field" />
            </div>
            <div className="flex-1" style={{ minWidth: 120 }}>
              <label className="section-label">Período fim</label>
              <input type="date" value={periodoFim} min={periodoInicio || undefined} onChange={(e) => setPeriodoFim(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowStatusEdit(false)} className="btn btn-outline btn-sm">
              Cancelar
            </button>
            <button onClick={saveStatus} className="btn btn-primary btn-sm">
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
