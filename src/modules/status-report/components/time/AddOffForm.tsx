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
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!membroId) { setError('Selecione um membro.'); return }
    if (!inicio || !fim) { setError('Preencha as datas.'); return }
    if (fim < inicio) { setError('Data fim deve ser >= data inicio.'); return }
    onAdd({ membroId, tipo, inicio, fim })
    setMembroId('')
    setInicio('')
    setFim('')
  }

  return (
    <form onSubmit={handleSubmit} className="card-sm" style={{ background: 'var(--color-bg)' }}>
      <div className="flex gap-2 flex-wrap">
        <div style={{ flex: 2, minWidth: 140 }}>
          <label className="section-label">Membro</label>
          <select value={membroId} onChange={(e) => setMembroId(e.target.value)} className="select-field">
            <option value="">Selecione...</option>
            {membros.filter((m) => m.ativo).map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label className="section-label">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoOff)} className="select-field">
            {TIPO_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="section-label">Início</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input-field" />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="section-label">Fim</label>
          <input type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} className="input-field" />
        </div>
        <div className="flex gap-1.5 items-end">
          <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Registrar
          </button>
          <button type="button" onClick={onCancel} className="btn btn-outline btn-sm">
            Cancelar
          </button>
        </div>
      </div>
      {error && (
        <p className="msg-error" style={{ margin: '8px 0 0', fontSize: 12 }}>
          {error}
        </p>
      )}
    </form>
  )
}
