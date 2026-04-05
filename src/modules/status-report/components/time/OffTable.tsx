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
      <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-3)' }}>
        <p style={{ fontSize: 13, margin: 0 }}>
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
          background: 'var(--color-surface-2)',
          borderBottom: '0.5px solid var(--color-border)',
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
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
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 65px 65px 45px 50px 80px 36px',
                gap: 0, padding: '8px 12px',
                borderBottom: '0.5px solid var(--color-border)',
                background: rowBg,
                opacity: off.alerta === 'encerrado' ? 0.5 : 1,
                fontSize: 12, color: 'var(--color-text)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {off.membro.nome}
              </span>
              <span style={{ color: 'var(--color-text-2)' }}>{TIPO_LABEL[off.tipo]}</span>
              <span>{formatDate(off.inicio)}</span>
              <span>{formatDate(off.fim)}</span>
              <span style={{ fontWeight: 600 }}>{off.duracaoDias}</span>
              <span style={{ fontWeight: 600 }}>{formatFaltam(off.diasRestantes)}</span>
              <span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                  background: badge.bg, color: badge.color,
                }}>
                  {badge.label}
                </span>
              </span>
              <button
                onClick={() => onRemove(off.id)}
                className="time-off-delete"
                style={{
                  width: 22, height: 22, borderRadius: 4, border: 'none',
                  background: 'none', color: 'var(--color-text-3)', cursor: 'pointer',
                  fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--color-text-3)' }}>
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
