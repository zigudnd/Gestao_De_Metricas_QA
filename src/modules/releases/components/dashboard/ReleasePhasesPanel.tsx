import { useState, useEffect, useCallback } from 'react'
import type { Release, ReleaseStatus } from '../../types/release.types'

interface ReleasePhasesPanelProps {
  release: Release
  onUpdateField: (field: string, value: string | number) => void
  onTransition: (newStatus: ReleaseStatus) => void
}

// ─── Phase definitions ──────────────────────────────────────────────────────

interface PhaseDef {
  key: string
  label: string
  dateField: keyof Release
  dateEndField?: keyof Release
  statusWhenActive: ReleaseStatus
  color: string
  icon: string
}

const PHASES: PhaseDef[] = [
  { key: 'corte',    label: 'Corte',        dateField: 'cutoffDate',       statusWhenActive: 'corte',              color: '#8b5cf6', icon: '✂️' },
  { key: 'geracao',  label: 'Geração',      dateField: 'buildDate',        statusWhenActive: 'em_desenvolvimento', color: 'var(--color-blue)', icon: '⚙️' },
  { key: 'homolog',  label: 'Homologação',  dateField: 'homologacaoStart', dateEndField: 'homologacaoEnd', statusWhenActive: 'em_homologacao', color: '#06b6d4', icon: '🧪' },
  { key: 'beta',     label: 'Beta',         dateField: 'betaDate',         statusWhenActive: 'em_regressivo',      color: 'var(--color-amber-mid)', icon: '📱' },
  { key: 'aprovada', label: 'Aprovação',    dateField: 'betaDate',         statusWhenActive: 'aprovada',           color: 'var(--color-green)', icon: '✅' },
  { key: 'producao', label: 'Produção',     dateField: 'productionDate',   statusWhenActive: 'em_producao',        color: 'var(--color-green-mid)', icon: '🚀' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type PhaseState = 'done' | 'active' | 'pending'

function getPhaseIndex(status: ReleaseStatus): number {
  switch (status) {
    case 'concluida': return 6
    case 'em_producao': return 5
    case 'aprovada': return 4
    case 'em_regressivo': return 3
    case 'em_homologacao': return 2
    case 'em_desenvolvimento': return 1
    case 'corte': return 0
    default: return -1
  }
}

function getPhaseState(phaseIdx: number, currentIdx: number): PhaseState {
  if (phaseIdx < currentIdx) return 'done'
  if (phaseIdx === currentIdx) return 'active'
  return 'pending'
}

const ROLLOUT_OPTIONS = [0, 1, 2, 3, 5, 10, 20, 40, 60, 80, 100]

const selectSm: React.CSSProperties = {
  padding: '6px 28px 6px 10px', borderRadius: 6, fontSize: 13,
  border: '1px solid var(--color-border-md)',
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleasePhasesPanel({ release, onUpdateField, onTransition }: ReleasePhasesPanelProps) {
  const [editingPhase, setEditingPhase] = useState<string | null>(null)
  const [confirmingPhase, setConfirmingPhase] = useState<number | null>(null)
  const currentIdx = getPhaseIndex(release.status)
  const isConcluida = release.status === 'concluida'

  const cancelConfirmation = useCallback(() => setConfirmingPhase(null), [])

  // Auto-cancel confirmation after 5 seconds
  useEffect(() => {
    if (confirmingPhase === null) return
    const timer = setTimeout(cancelConfirmation, 5000)
    return () => clearTimeout(timer)
  }, [confirmingPhase, cancelConfirmation])

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: '20px 24px', marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>
        Pipeline da Release
      </div>

      {/* Phase cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PHASES.map((phase, i) => {
          const state = getPhaseState(i, currentIdx)
          const dateVal = String(release[phase.dateField] ?? '')
          const dateEndVal = phase.dateEndField ? String(release[phase.dateEndField] ?? '') : ''
          const isEditing = editingPhase === phase.key
          const isNext = state === 'pending' && i === currentIdx + 1

          return (
            <div key={phase.key}>
              {/* Phase row */}
              <div
                role={isConcluida ? undefined : 'button'}
                tabIndex={isConcluida ? undefined : 0}
                aria-expanded={isEditing}
                aria-label={`Fase ${phase.label} — ${state === 'done' ? 'Concluída' : state === 'active' ? 'Em andamento' : 'Pendente'}${dateVal ? ` — ${fmtDate(dateVal)}` : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: state === 'active' ? `color-mix(in srgb, ${phase.color} 5%, transparent)`
                    : state === 'done' ? 'var(--color-green-light)'
                    : 'var(--color-surface-2)',
                  border: state === 'active' ? `1.5px solid color-mix(in srgb, ${phase.color} 25%, transparent)`
                    : '1px solid var(--color-border)',
                  transition: 'all 0.15s',
                  cursor: isConcluida ? 'default' : 'pointer',
                  outline: 'none',
                }}
                onClick={() => !isConcluida && setEditingPhase(isEditing ? null : phase.key)}
                onKeyDown={(e) => { if (!isConcluida && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditingPhase(isEditing ? null : phase.key) } }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)' }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = state === 'active' ? `0 0 0 3px color-mix(in srgb, ${phase.color} 15%, transparent)` : 'none' }}
              >
                {/* Step indicator */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                  background: state === 'done' ? 'var(--color-green-mid)'
                    : state === 'active' ? phase.color
                    : 'var(--color-surface)',
                  color: state === 'pending' ? 'var(--color-text-3)' : '#fff',
                  border: state === 'pending' ? '2px solid var(--color-border-md)' : 'none',
                  fontWeight: 700,
                  boxShadow: state === 'active' ? `0 0 0 3px color-mix(in srgb, ${phase.color} 15%, transparent)` : 'none',
                }}>
                  {state === 'done' ? '✓' : phase.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: state === 'done' ? 'var(--color-green)'
                        : state === 'active' ? phase.color
                        : 'var(--color-text-2)',
                    }}>
                      {phase.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
                      background: state === 'done' ? 'var(--color-green-mid)'
                        : state === 'active' ? phase.color
                        : 'var(--color-border-md)',
                      color: '#fff',
                    }}>
                      {state === 'done' ? 'Concluído' : state === 'active' ? 'Em andamento' : 'Pendente'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                    {dateVal ? fmtDate(dateVal) : 'Sem data'}
                    {dateEndVal ? ` — ${fmtDate(dateEndVal)}` : ''}
                  </div>
                </div>

                {/* Action buttons — always visible */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  {isNext && !isConcluida && (
                    confirmingPhase === i ? (
                      <>
                        <button
                          onClick={() => { setConfirmingPhase(null); onTransition(phase.statusWhenActive) }}
                          aria-label={`Confirmar iniciar ${phase.label}`}
                          style={{
                            padding: '6px 14px', borderRadius: 7, border: 'none',
                            background: 'var(--color-amber-mid)', color: '#fff',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                            transition: 'all 0.15s', minHeight: 36,
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        >
                          Confirmar?
                        </button>
                        <button
                          onClick={cancelConfirmation}
                          aria-label="Cancelar"
                          style={{
                            padding: '6px 10px', borderRadius: 7,
                            border: '1px solid var(--color-border-md)',
                            background: 'var(--color-surface)', color: 'var(--color-text-2)',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                            transition: 'all 0.15s', minHeight: 36,
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmingPhase(i)}
                        aria-label={`Iniciar ${phase.label}`}
                        style={{
                          padding: '6px 14px', borderRadius: 7, border: 'none',
                          background: phase.color, color: '#fff',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                          transition: 'all 0.15s', minHeight: 36,
                        }}
                      >
                        ▶ Iniciar
                      </button>
                    )
                  )}
                  {state === 'active' && i < PHASES.length - 1 && !isConcluida && (
                    confirmingPhase === i ? (
                      <>
                        <button
                          onClick={() => { setConfirmingPhase(null); onTransition(PHASES[i + 1].statusWhenActive) }}
                          aria-label={`Confirmar concluir ${phase.label}`}
                          style={{
                            padding: '6px 14px', borderRadius: 7, border: 'none',
                            background: 'var(--color-amber-mid)', color: '#fff',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                            transition: 'all 0.15s', minHeight: 36,
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        >
                          Confirmar?
                        </button>
                        <button
                          onClick={cancelConfirmation}
                          aria-label="Cancelar"
                          style={{
                            padding: '6px 10px', borderRadius: 7,
                            border: '1px solid var(--color-border-md)',
                            background: 'var(--color-surface)', color: 'var(--color-text-2)',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                            transition: 'all 0.15s', minHeight: 36,
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmingPhase(i)}
                        aria-label={`Concluir ${phase.label}`}
                        style={{
                          padding: '6px 14px', borderRadius: 7, border: 'none',
                          background: 'var(--color-green-mid)', color: '#fff',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                          transition: 'all 0.15s', minHeight: 36,
                        }}
                      >
                        ✓ Concluir
                      </button>
                    )
                  )}
                </div>

                {/* Chevron */}
                {!isConcluida && (
                  <span aria-hidden="true" style={{
                    fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0,
                    transition: 'transform 0.15s',
                    transform: isEditing ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▾</span>
                )}
              </div>

              {/* Inline edit — dates */}
              {isEditing && !isConcluida && (
                <div style={{
                  padding: '12px 14px 12px 58px', // alinhado com o conteúdo (32px dot + 12px gap + 14px padding)
                  display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {phase.dateEndField ? 'Início' : 'Data'}
                    </label>
                    <input
                      type="date" value={dateVal}
                      onChange={(e) => onUpdateField(phase.dateField, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }}
                    />
                  </div>
                  {phase.dateEndField && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Fim
                      </label>
                      <input
                        type="date" value={dateEndVal} min={dateVal || undefined}
                        onChange={(e) => onUpdateField(phase.dateEndField as string, e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', fontSize: 12, fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rollout % — visible when em_producao or concluida */}
      {(release.status === 'em_producao' || release.status === 'concluida') && (
        <div style={{
          marginTop: 12, padding: '14px 14px',
          background: 'var(--color-green-light)', borderRadius: 10,
          border: '1px solid var(--color-green-mid)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              Distribuição em Produção
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={release.rolloutPct}
              onChange={(e) => onUpdateField('rolloutPct', Number(e.target.value))}
              disabled={isConcluida}
              aria-label="Porcentagem de distribuicao"
              style={{ ...selectSm, width: 100, opacity: isConcluida ? 0.6 : 1 }}
            >
              {ROLLOUT_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.4s',
                width: `${release.rolloutPct}%`,
                background: release.rolloutPct >= 100 ? 'var(--color-green-mid)'
                  : release.rolloutPct >= 50 ? 'var(--color-amber-mid)'
                  : 'var(--color-blue)',
              }} />
            </div>
            <span style={{
              fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-family-mono)',
              color: release.rolloutPct >= 100 ? 'var(--color-green-mid)' : 'var(--color-text)',
              minWidth: 45, textAlign: 'right',
            }}>
              {release.rolloutPct}%
            </span>
          </div>
          {release.rolloutPct >= 100 && !isConcluida && (
            confirmingPhase === -1 ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  onClick={() => { setConfirmingPhase(null); onTransition('concluida') }}
                  aria-label="Confirmar concluir release"
                  style={{
                    padding: '7px 16px', borderRadius: 7, border: 'none',
                    background: 'var(--color-amber-mid)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--font-family-sans)',
                    transition: 'all 0.15s', minHeight: 36,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  Confirmar conclusão?
                </button>
                <button
                  onClick={cancelConfirmation}
                  aria-label="Cancelar"
                  style={{
                    padding: '7px 12px', borderRadius: 7,
                    border: '1px solid var(--color-border-md)',
                    background: 'var(--color-surface)', color: 'var(--color-text-2)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--font-family-sans)',
                    transition: 'all 0.15s', minHeight: 36,
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingPhase(-1)}
                aria-label="Concluir release"
                style={{
                  marginTop: 10, padding: '7px 16px', borderRadius: 7, border: 'none',
                  background: 'var(--color-green-mid)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  transition: 'all 0.15s', minHeight: 36,
                }}
              >
                ✓ Concluir Release (100% distribuído)
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
