import { useState } from 'react'
import { REVIEW_STATUS_CONFIG, CHANGE_TYPE_CONFIG, BADGE_RADIUS } from '../../constants/pr-constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SquadPR {
  id: string
  pr_link: string
  repository: string
  change_type: string
  review_status: string
  user_email?: string
}

interface SquadParticipation {
  squad_id: string
  squad_name: string
  squad_color?: string
  total_prs: number
  approved: number
  pending: number
  rejected: number
  has_tests: boolean
  prs: SquadPR[]
}

interface SquadParticipationViewProps {
  squads: SquadParticipation[]
  onPRClick: (prId: string) => void
}

// ─── Constants (derived from shared pr-constants) ───────────────────────────

const CHANGE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  feature: { bg: 'var(--color-blue-light)', color: CHANGE_TYPE_CONFIG.feature.color },
  fix: { bg: 'var(--color-red-light)', color: CHANGE_TYPE_CONFIG.fix.color },
  hotfix: { bg: '#fff7ed', color: CHANGE_TYPE_CONFIG.hotfix.color },
  refactor: { bg: '#f3e8ff', color: CHANGE_TYPE_CONFIG.refactor.color },
}

const STATUS_COLORS = Object.fromEntries(
  Object.entries(REVIEW_STATUS_CONFIG).map(([k, v]) => [k, { bg: v.bg, color: v.color }]),
) as Record<string, { bg: string; color: string }>

const STATUS_LABELS = Object.fromEntries(
  Object.entries(REVIEW_STATUS_CONFIG).map(([k, v]) => [k, v.label]),
) as Record<string, string>

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ComplianceLevel = 'conforme' | 'pendente_testes' | 'prs_pendentes'

function getCompliance(squad: SquadParticipation): ComplianceLevel {
  if (squad.pending > 0 || squad.rejected > 0) return 'prs_pendentes'
  if (!squad.has_tests) return 'pendente_testes'
  return 'conforme'
}

const COMPLIANCE_CONFIG: Record<ComplianceLevel, { label: string; color: string; bg: string }> = {
  conforme: { label: 'Conforme', color: 'var(--color-green)', bg: 'var(--color-green-light)' },
  pendente_testes: { label: 'Pendente testes', color: 'var(--color-amber)', bg: 'var(--color-amber-light)' },
  prs_pendentes: { label: 'PRs pendentes', color: 'var(--color-red)', bg: 'var(--color-red-light)' },
}

function extractRepoName(repo: string): string {
  const parts = repo.split('/')
  return parts[parts.length - 1] || repo
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SquadParticipationView({ squads, onPRClick }: SquadParticipationViewProps) {
  const [openCards, setOpenCards] = useState<Set<string>>(new Set())

  function toggleCard(squadId: string) {
    setOpenCards((prev) => {
      const next = new Set(prev)
      if (next.has(squadId)) next.delete(squadId)
      else next.add(squadId)
      return next
    })
  }

  // ── Empty state ──
  if (squads.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 20px',
        color: 'var(--color-text-3)', fontSize: 13,
      }}>
        Nenhum squad cadastrou PRs nesta release.
      </div>
    )
  }

  return (
    <div>
      <style>{`
        .squad-pr-card:hover { box-shadow: var(--shadow-md) !important; }
        .squad-pr-row:hover { background: var(--color-blue-light) !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {squads.map((squad, index) => {
          const isOpen = openCards.has(squad.squad_id)
          const compliance = getCompliance(squad)
          const complianceCfg = COMPLIANCE_CONFIG[compliance]

          return (
            <div
              key={squad.squad_id}
              className="anim-fade-up squad-pr-card"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'box-shadow 0.15s',
                animationDelay: `${index * 0.05}s`,
              }}
            >
              {/* Card header */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => toggleCard(squad.squad_id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(squad.squad_id) } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexWrap: 'wrap',
                }}
              >
                {/* Color dot + Squad name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: squad.squad_color || 'var(--color-blue)',
                  }} />
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {squad.squad_name}
                  </span>
                </div>

                {/* PR count badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* Total */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                    background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
                  }}>
                    {squad.total_prs} PR{squad.total_prs !== 1 ? 's' : ''}
                  </span>
                  {/* Approved */}
                  {squad.approved > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                      background: 'var(--color-green-light)', color: 'var(--color-green)',
                    }}>
                      {squad.approved} aprovado{squad.approved !== 1 ? 's' : ''}
                    </span>
                  )}
                  {/* Pending */}
                  {squad.pending > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                      background: 'var(--color-amber-light)', color: 'var(--color-amber)',
                    }}>
                      {squad.pending} pendente{squad.pending !== 1 ? 's' : ''}
                    </span>
                  )}
                  {/* Rejected */}
                  {squad.rejected > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                      background: 'var(--color-red-light)', color: 'var(--color-red)',
                    }}>
                      {squad.rejected} rejeitado{squad.rejected !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Compliance badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 20, whiteSpace: 'nowrap',
                  background: complianceCfg.bg, color: complianceCfg.color,
                  letterSpacing: 0.3,
                }}>
                  {complianceCfg.label}
                </span>

                {/* Chevron */}
                <span aria-hidden="true" style={{
                  fontSize: 14, color: 'var(--color-text-3)',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                }}>
                  &#x25BE;
                </span>
              </div>

              {/* Expanded body — PR table */}
              {isOpen && (
                <div style={{
                  borderTop: '1px solid var(--color-border)',
                  padding: '12px 18px',
                }}>
                  {squad.prs.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '20px 0',
                      color: 'var(--color-text-3)', fontSize: 12,
                    }}>
                      Nenhum PR registrado.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {/* Table header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 100px 100px',
                        gap: 8,
                        padding: '6px 10px',
                        borderBottom: '1px solid var(--color-border)',
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          PR Link
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Repositorio
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Tipo
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Status
                        </span>
                      </div>

                      {/* Table rows */}
                      {squad.prs.map((pr) => {
                        const typeStyle = CHANGE_TYPE_COLORS[pr.change_type] || { bg: 'var(--color-surface-2)', color: 'var(--color-text-3)' }
                        const statusStyle = STATUS_COLORS[pr.review_status] || STATUS_COLORS.pending
                        const statusLabel = STATUS_LABELS[pr.review_status] || pr.review_status

                        return (
                          <div
                            key={pr.id}
                            className="squad-pr-row"
                            role="button"
                            tabIndex={0}
                            onClick={() => onPRClick(pr.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPRClick(pr.id) } }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 120px 100px 100px',
                              gap: 8,
                              padding: '8px 10px',
                              cursor: 'pointer',
                              borderRadius: 6,
                              transition: 'background 0.15s',
                              alignItems: 'center',
                            }}
                          >
                            {/* PR link */}
                            <span style={{
                              fontSize: 12, fontWeight: 600, color: 'var(--color-blue)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}>
                              {pr.pr_link}
                            </span>

                            {/* Repository */}
                            <span style={{
                              fontSize: 11, fontWeight: 500, color: 'var(--color-text-2)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontFamily: 'var(--font-family-mono)',
                            }}>
                              {extractRepoName(pr.repository)}
                            </span>

                            {/* Change type badge */}
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px',
                              borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                              background: typeStyle.bg, color: typeStyle.color,
                              textAlign: 'center', justifySelf: 'start',
                            }}>
                              {pr.change_type}
                            </span>

                            {/* Status badge */}
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px',
                              borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                              background: statusStyle.bg, color: statusStyle.color,
                              textAlign: 'center', justifySelf: 'start',
                            }}>
                              {statusLabel}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
