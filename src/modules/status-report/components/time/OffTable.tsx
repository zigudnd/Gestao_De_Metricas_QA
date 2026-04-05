import type { PeriodoOffComAlerta, AlertaProximidade, TipoOff } from '../../types/squadConfig.types'

interface OffTableProps {
  offs: PeriodoOffComAlerta[]
  onRemove: (id: string) => void
}

const TIPO_LABEL: Record<TipoOff, string> = {
  ferias:  'Férias',
  off:     'Day off',
  licenca: 'Licença',
  feriado: 'Feriado',
}

const ALERTA_BG: Record<AlertaProximidade, string | undefined> = {
  warn7:     'var(--color-red-light)',
  warn30:    'var(--color-amber-light)',
  ativo:     'var(--color-green-light)',
  encerrado: undefined,
  normal:    undefined,
}

const ALERTA_BADGE: Record<AlertaProximidade, { label: string; bg: string; color: string }> = {
  encerrado: { label: 'Encerrado',  bg: 'var(--color-surface-2)', color: 'var(--color-text-3)' },
  ativo:     { label: 'Em curso',   bg: 'var(--color-green-light)', color: 'var(--color-green)' },
  warn7:     { label: 'Em 7 dias',  bg: 'var(--color-red-light)', color: 'var(--color-red)' },
  warn30:    { label: 'Em 30 dias', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
  normal:    { label: 'Agendado',   bg: 'var(--color-green-light)', color: 'var(--color-green)' },
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function formatFaltam(diasRestantes: number | null): string {
  if (diasRestantes === null) return '—'
  if (diasRestantes === 0) return 'hoje'
  return `${diasRestantes}d`
}

export function OffTable({ offs, onRemove }: OffTableProps) {
  if (offs.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: '24px 16px' }}>
        <p className="text-body" style={{ margin: 0 }}>
          Nenhum período registrado. Clique em &quot;+ Registrar período&quot; para começar.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        border: '0.5px solid var(--color-border)',
        borderRadius: 8, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 65px 65px 45px 50px 80px 36px',
          gap: 0, padding: '8px 12px',
        }} className="table-header">
          <span>Membro</span>
          <span>Tipo</span>
          <span>Início</span>
          <span>Fim</span>
          <span>Dias</span>
          <span>Faltam</span>
          <span>Status</span>
          <span />
        </div>

        {/* Rows */}
        {offs.map((off) => {
          const badge = ALERTA_BADGE[off.alerta]
          const rowBg = ALERTA_BG[off.alerta]
          return (
            <div
              key={off.id}
              className="table-cell items-center"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 65px 65px 45px 50px 80px 36px',
                gap: 0,
                background: rowBg,
                opacity: off.alerta === 'encerrado' ? 0.5 : 1,
              }}
            >
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {off.membro.nome}
              </span>
              <span className="text-small">{TIPO_LABEL[off.tipo]}</span>
              <span>{formatDate(off.inicio)}</span>
              <span>{formatDate(off.fim)}</span>
              <span style={{ fontWeight: 600 }}>{off.duracaoDias}</span>
              <span style={{ fontWeight: 600 }}>{formatFaltam(off.diasRestantes)}</span>
              <span>
                <span className="badge" style={{
                  background: badge.bg, color: badge.color,
                }}>
                  {badge.label}
                </span>
              </span>
              <button
                onClick={() => onRemove(off.id)}
                className="time-off-delete btn btn-ghost"
                style={{
                  width: 22, height: 22, padding: 0,
                  opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
                }}
                title="Remover"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mt-2.5 text-small text-muted">
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-amber-light)', marginRight: 4 }} />Férias em até 30 dias</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red-light)', marginRight: 4 }} />Férias em até 7 dias</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green-light)', marginRight: 4 }} />Período ativo ou agendado</span>
      </div>
      <style>{`
        .time-off-delete:hover { opacity: 1 !important; color: var(--color-red) !important; }
      `}</style>
    </div>
  )
}
