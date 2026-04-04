import type { ReleaseSquad, SquadMetrics, ReleaseSquadStatus } from '../../types/release.types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReleaseSquadCardProps {
  squad: ReleaseSquad
  metrics: SquadMetrics
  onClick: () => void
  index?: number
  releaseStatus?: string
  rolloutPct?: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SQUAD_STATUS_LABELS: Record<ReleaseSquadStatus, string> = {
  not_started: 'Nao iniciado',
  testing: 'Em Andamento',
  em_regressivo: 'Em Regressivo',
  blocked: 'Bloqueado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const SQUAD_STATUS_COLORS: Record<ReleaseSquadStatus, string> = {
  not_started: 'var(--color-text-3)',
  testing: 'var(--color-blue)',
  em_regressivo: '#f97316',
  blocked: 'var(--color-red)',
  approved: 'var(--color-green)',
  rejected: 'var(--color-red)',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function progressColor(pct: number): string {
  if (pct >= 100) return 'var(--color-green)'
  if (pct >= 60) return 'var(--color-amber-mid)'
  return 'var(--color-red)'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReleaseSquadCard({ squad, metrics, onClick, index = 0, releaseStatus, rolloutPct }: ReleaseSquadCardProps) {
  const showRollout = (releaseStatus === 'em_producao' || releaseStatus === 'concluida') && typeof rolloutPct === 'number'
  const statusColor = SQUAD_STATUS_COLORS[squad.status]
  const statusLabel = SQUAD_STATUS_LABELS[squad.status]
  const pct = metrics.coveragePct
  const barColor = progressColor(pct)

  const criticalBugs = squad.bugs.filter(
    (b) => (b.status === 'Aberto' || b.status === 'Em Andamento') && b.severity === 'Crítica',
  ).length

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="anim-fade-up"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Header: name + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>
          {squad.squadName}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 4, background: `${statusColor}18`, color: statusColor,
          whiteSpace: 'nowrap',
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Feature type badge */}
      <div style={{ marginBottom: 12 }}>
        {squad.hasNewFeatures ? (
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'var(--color-amber)',
          }}>
            ✦ Features novas
          </span>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)',
          }}>
            ○ Somente regressivo
          </span>
        )}
      </div>

      {/* Section 1: EXECUÇÃO GERAL */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
        }}>
          EXECUCAO GERAL
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, height: 8, borderRadius: 4,
            background: 'var(--color-surface-2)',
          }}>
            <div style={{
              width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4,
              background: barColor, transition: 'width 0.4s ease',
              minWidth: pct > 0 ? 4 : 0,
            }} />
          </div>
          <span style={{
            fontSize: 16, fontWeight: 800, color: barColor,
            fontFamily: 'var(--font-family-mono)',
            minWidth: 42, textAlign: 'right',
          }}>
            {pct}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)',
            fontFamily: 'var(--font-family-mono)',
          }}>
            {metrics.executedTests}/{metrics.totalTests}
          </span>
          {metrics.failedTests > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--color-red)',
            }}>
              {metrics.failedTests} falha{metrics.failedTests > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Section 2: APROVACAO (pass rate) */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
        }}>
          APROVACAO
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 3,
            background: 'var(--color-surface-2)',
          }}>
            <div style={{
              width: `${Math.min(metrics.passPct, 100)}%`, height: '100%', borderRadius: 3,
              background: progressColor(metrics.passPct), transition: 'width 0.4s ease',
              minWidth: metrics.passPct > 0 ? 4 : 0,
            }} />
          </div>
          <span style={{
            fontSize: 14, fontWeight: 800, color: progressColor(metrics.passPct),
            fontFamily: 'var(--font-family-mono)',
            minWidth: 38, textAlign: 'right',
          }}>
            {metrics.passPct}%
          </span>
        </div>
        <div style={{ marginTop: 3 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)',
            fontFamily: 'var(--font-family-mono)',
          }}>
            {metrics.passedTests}/{metrics.totalTests} aprovados
          </span>
        </div>
      </div>

      {/* Bugs line */}
      <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginBottom: squad.notes ? 8 : 0 }}>
        Bugs: {metrics.openBugs}
        {criticalBugs > 0 && (
          <span style={{ color: 'var(--color-red)', fontWeight: 700 }}>
            {' '}({criticalBugs} critico{criticalBugs !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Rollout distribution — visible when release is in production */}
      {showRollout && (
        <div style={{
          marginBottom: squad.notes ? 8 : 0,
          padding: '8px 0',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 4,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              DISTRIBUICAO
            </span>
            <span style={{
              fontSize: 14, fontWeight: 800,
              fontFamily: 'var(--font-family-mono)',
              color: rolloutPct! >= 100 ? 'var(--color-green)'
                : rolloutPct! >= 50 ? 'var(--color-amber-mid)'
                : 'var(--color-blue)',
            }}>
              {rolloutPct}%
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3,
            background: 'var(--color-surface-2)',
          }}>
            <div style={{
              width: `${Math.min(rolloutPct!, 100)}%`,
              height: '100%', borderRadius: 3,
              background: rolloutPct! >= 100 ? 'var(--color-green)'
                : rolloutPct! >= 50 ? 'var(--color-amber-mid)'
                : 'var(--color-blue)',
              transition: 'width 0.4s ease',
              minWidth: rolloutPct! > 0 ? 4 : 0,
            }} />
          </div>
          {rolloutPct! >= 100 && (
            <div style={{ fontSize: 10, color: 'var(--color-green)', fontWeight: 600, marginTop: 3 }}>
              100% distribuido
            </div>
          )}
        </div>
      )}

      {/* Notes (truncated to 2 lines) */}
      {squad.notes && (
        <div style={{
          fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {squad.notes}
        </div>
      )}
    </div>
  )
}
