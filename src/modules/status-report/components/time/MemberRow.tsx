import { useState } from 'react'
import type { MembroTime } from '../../types/squadConfig.types'

interface MemberRowProps {
  membro: MembroTime
  onRemove?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<MembroTime>) => void
}

const PAPEL_CORES: Record<string, { bg: string; text: string }> = {
  'Dev Mobile iOS':     { bg: '#E6F1FB', text: '#0C447C' },
  'Dev Mobile Android': { bg: '#EAF3DE', text: '#27500A' },
  'Dev Backend':        { bg: '#FAEEDA', text: '#633806' },
  'Dev BFF':            { bg: '#E1F5EE', text: '#085041' },
  'QA':                 { bg: '#EEEDFE', text: '#3C3489' },
  'Tech Lead':          { bg: '#FCEBEB', text: '#791F1F' },
  'Scrum Master':       { bg: '#FBEAF0', text: '#72243E' },
  'Product Owner':      { bg: '#FAECE7', text: '#712B13' },
  'Designer':           { bg: '#F1EFE8', text: '#444441' },
}

const FALLBACK_CORES = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#FCEBEB', text: '#791F1F' },
]

const ROLE_LABEL: Record<string, string> = {
  qa_lead: 'QA Lead', qa: 'QA', stakeholder: 'Stakeholder',
}

const MOTIVOS = ['Rotacao', 'Reforco', 'Suporte tecnico', 'Cobertura de ferias']

function getCorPapel(papel: string, id: string): { bg: string; text: string } {
  if (PAPEL_CORES[papel]) return PAPEL_CORES[papel]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_CORES[hash % FALLBACK_CORES.length]
}

function getIniciais(nome: string): string {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: cor.bg, color: cor.text,
          border: `0.5px solid ${cor.text}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          {getIniciais(membro.nome)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
              {membro.nome}
            </span>
            {membro.papel && (
              <span style={{
                fontSize: 10, color: cor.text, background: cor.bg,
                padding: '1px 8px', borderRadius: 8, fontWeight: 600,
              }}>
                {membro.papel}
              </span>
            )}
            {membro.squadRole && (
              <span style={{
                fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 8,
                background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
                border: '0.5px solid var(--color-border)',
              }}>
                {ROLE_LABEL[membro.squadRole] || membro.squadRole}
              </span>
            )}
            {isTemp && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
                background: 'var(--color-amber-light)', color: 'var(--color-amber)',
                border: '0.5px solid var(--color-amber-mid)',
              }}>
                Temporario
              </span>
            )}
          </div>
          {/* Segunda linha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {membro.email && (
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{membro.email}</span>
            )}
            {membro.motivo && (
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>· {membro.motivo}</span>
            )}
            {membro.periodoInicio && membro.periodoFim && (
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                · {membro.periodoInicio.split('-').reverse().slice(0, 2).join('/')} — {membro.periodoFim.split('-').reverse().slice(0, 2).join('/')}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isTemp && onUpdate && (
          <button
            onClick={() => setShowStatusEdit(!showStatusEdit)}
            style={{
              padding: '3px 8px', borderRadius: 5, border: 'none',
              background: showStatusEdit ? 'var(--color-blue-light)' : 'none',
              color: showStatusEdit ? 'var(--color-blue)' : 'var(--color-text-3)',
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {showStatusEdit ? 'Fechar' : 'Status'}
          </button>
        )}
        {isTemp && onRemove && (
          <button
            onClick={() => onRemove(membro.id)}
            style={{
              width: 22, height: 22, borderRadius: 4, border: 'none',
              background: 'none', color: 'var(--color-text-3)', cursor: 'pointer',
              fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-red)' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--color-text-3)' }}
            title="Remover membro temporario"
          >
            ×
          </button>
        )}
      </div>

      {/* Status edit panel (expandível) */}
      {showStatusEdit && (
        <div style={{
          borderTop: '0.5px solid var(--color-border)',
          padding: '10px 12px',
          background: 'var(--color-bg)',
        }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={labelSm}>Motivo</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={inputSm}>
                <option value="">Sem motivo</option>
                {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelSm}>Periodo inicio</label>
              <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} style={inputSm} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelSm}>Periodo fim</label>
              <input type="date" value={periodoFim} min={periodoInicio || undefined} onChange={(e) => setPeriodoFim(e.target.value)} style={inputSm} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowStatusEdit(false)} style={{
              padding: '5px 12px', borderRadius: 6,
              border: '1px solid var(--color-border-md)',
              background: 'transparent', color: 'var(--color-text-2)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
            }}>
              Cancelar
            </button>
            <button onClick={saveStatus} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: 'var(--color-blue)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
            }}>
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const labelSm: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--color-text-2)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

const inputSm: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '7px 10px', fontSize: 13,
  border: '0.5px solid var(--color-border)', borderRadius: 6,
  background: 'var(--color-surface)', color: 'var(--color-text)',
  outline: 'none', fontFamily: 'var(--font-family-sans)',
}
