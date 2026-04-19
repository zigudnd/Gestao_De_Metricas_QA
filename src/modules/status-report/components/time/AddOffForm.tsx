import { useState } from 'react'
import type { MembroTime, TipoOff } from '../../types/squadConfig.types'

interface AddOffFormProps {
  membros: MembroTime[]
  onAdd: (off: { membroId: string; tipo: TipoOff; inicio: string; fim: string; observacao?: string }) => void
  onCancel: () => void
}

const TIPO_OPTIONS: { value: TipoOff; label: string }[] = [
  { value: 'ferias', label: 'Férias' },
  { value: 'off', label: 'Day off' },
  { value: 'licenca', label: 'Licença' },
  { value: 'feriado', label: 'Feriado' },
]

export function AddOffForm({ membros, onAdd, onCancel }: AddOffFormProps) {
  const [membroId, setMembroId] = useState('')
  const [tipo, setTipo] = useState<TipoOff>('ferias')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!membroId) { setError('Selecione um membro.'); return }
    if (!inicio || !fim) { setError('Preencha as datas.'); return }
    if (fim < inicio) { setError('Data fim deve ser >= data inicio.'); return }
    onAdd({ membroId, tipo, inicio, fim, observacao: observacao || undefined })
    setMembroId('')
    setInicio('')
    setFim('')
    setObservacao('')
  }

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '12px 14px',
      background: 'var(--color-bg)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: error ? 0 : 0 }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <label style={labelSm}>Membro</label>
          <select value={membroId} onChange={(e) => setMembroId(e.target.value)} style={inputSm}>
            <option value="">Selecione...</option>
            {membros.filter((m) => m.ativo).map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={labelSm}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoOff)} style={inputSm}>
            {TIPO_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={labelSm}>Início</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={inputSm} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={labelSm}>Fim</label>
          <input type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} style={inputSm} />
        </div>
        <div style={{ flex: 2, minWidth: 140 }}>
          <label style={labelSm}>Observacao</label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: viagem, consulta..."
            style={inputSm}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <button type="submit" style={{
            padding: '7px 16px', borderRadius: 6, border: 'none',
            background: 'var(--color-blue)', color: '#fff', fontSize: 12,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
            whiteSpace: 'nowrap',
          }}>
            Registrar
          </button>
          <button type="button" onClick={onCancel} style={{
            padding: '7px 16px', borderRadius: 6,
            border: '1px solid var(--color-border-md)',
            background: 'transparent', color: 'var(--color-text-2)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          }}>
            Cancelar
          </button>
        </div>
      </div>
      {error && (
        <p style={{
          margin: '8px 0 0', fontSize: 12, color: 'var(--color-red)',
          background: 'var(--color-red-light)', padding: '6px 10px',
          borderRadius: 6,
        }}>
          {error}
        </p>
      )}
    </form>
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
