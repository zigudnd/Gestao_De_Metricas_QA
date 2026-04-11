import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SprintSquad {
  squadId: string
  squadName: string
  featureCount: number
  testCount: number
}

interface IntegratedSquadsPanelProps {
  releaseId: string
  sprintSquads: SprintSquad[]
}

interface ApprovedPRRow {
  squad_id: string
  squads: { name: string; color: string } | null
}

interface SquadData {
  squadId: string
  squadName: string
  squadColor: string
  approvedPRs: number
  testCount: number
  featureCount: number
  hasTests: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BADGE_RADIUS = 12

const COMPLIANCE = {
  conforme: { label: 'Conforme', color: 'var(--color-green)', bg: 'var(--color-green-light)' },
  pendente: { label: 'Pendente', color: 'var(--color-amber)', bg: 'var(--color-amber-light)' },
} as const

// ─── Component ───────────────────────────────────────────────────────────────

export function IntegratedSquadsPanel({ releaseId, sprintSquads }: IntegratedSquadsPanelProps) {
  const [squads, setSquads] = useState<SquadData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchApprovedPRs() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('release_prs')
        .select('squad_id, squads:squad_id(name, color)')
        .eq('release_id', releaseId)
        .eq('review_status', 'approved')

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as unknown as ApprovedPRRow[]

      // Group by squad_id and count approved PRs
      const prCountMap = new Map<string, { count: number; name: string; color: string }>()
      for (const row of rows) {
        const existing = prCountMap.get(row.squad_id)
        if (existing) {
          existing.count++
        } else {
          prCountMap.set(row.squad_id, {
            count: 1,
            name: row.squads?.name ?? 'Squad desconhecido',
            color: row.squads?.color ?? 'var(--color-blue)',
          })
        }
      }

      // Build squad list by merging PR data with sprint squads
      const sprintSquadMap = new Map(sprintSquads.map((s) => [s.squadId, s]))
      const allSquadIds = new Set([...prCountMap.keys(), ...sprintSquads.map((s) => s.squadId)])

      const merged: SquadData[] = []
      for (const id of allSquadIds) {
        const prInfo = prCountMap.get(id)
        const sprintInfo = sprintSquadMap.get(id)

        merged.push({
          squadId: id,
          squadName: prInfo?.name ?? sprintInfo?.squadName ?? 'Squad desconhecido',
          squadColor: prInfo?.color ?? 'var(--color-blue)',
          approvedPRs: prInfo?.count ?? 0,
          testCount: sprintInfo?.testCount ?? 0,
          featureCount: sprintInfo?.featureCount ?? 0,
          hasTests: (sprintInfo?.testCount ?? 0) > 0,
        })
      }

      // Sort: squads with tests first, then alphabetical
      merged.sort((a, b) => {
        if (a.hasTests !== b.hasTests) return a.hasTests ? -1 : 1
        return a.squadName.localeCompare(b.squadName)
      })

      setSquads(merged)
      setLoading(false)
    }

    fetchApprovedPRs()
    return () => { cancelled = true }
  }, [releaseId, sprintSquads])

  // ── Derived ──
  const conformeCount = squads.filter((s) => s.hasTests).length
  const totalCount = squads.length

  // ── Loading ──
  if (loading) {
    return (
      <div
        role="region"
        aria-label="Squads participantes"
        style={{
          textAlign: 'center', padding: '32px 20px',
          color: 'var(--color-text-3)', fontSize: 13,
        }}
      >
        Carregando squads participantes...
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div
        role="region"
        aria-label="Squads participantes"
        style={{
          textAlign: 'center', padding: '32px 20px',
          color: 'var(--color-red)', fontSize: 13,
        }}
      >
        Erro ao carregar squads: {error}
      </div>
    )
  }

  // ── Empty ──
  if (squads.length === 0) {
    return (
      <div
        role="region"
        aria-label="Squads participantes"
        style={{
          textAlign: 'center', padding: '48px 20px',
          color: 'var(--color-text-3)', fontSize: 13,
        }}
      >
        Nenhum squad com PRs aprovados nesta release.
      </div>
    )
  }

  return (
    <div role="region" aria-label="Squads participantes">
      {/* Summary badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '4px 12px',
          borderRadius: 20, whiteSpace: 'nowrap',
          background: conformeCount === totalCount
            ? 'var(--color-green-light)'
            : 'var(--color-amber-light)',
          color: conformeCount === totalCount
            ? 'var(--color-green)'
            : 'var(--color-amber)',
        }}>
          {conformeCount} de {totalCount} squads com testes cadastrados
        </span>
      </div>

      {/* Squad cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {squads.map((squad, index) => {
          const compliance = squad.hasTests ? COMPLIANCE.conforme : COMPLIANCE.pendente

          return (
            <div
              key={squad.squadId}
              className="anim-fade-up"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '14px 18px',
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                flexWrap: 'wrap',
              }}>
                {/* Color dot + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: squad.squadColor,
                  }} />
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {squad.squadName}
                  </span>
                </div>

                {/* Approved PRs badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                  background: 'var(--color-green-light)', color: 'var(--color-green)',
                }}>
                  {squad.approvedPRs} PR{squad.approvedPRs !== 1 ? 's' : ''} aprovado{squad.approvedPRs !== 1 ? 's' : ''}
                </span>

                {/* Test count badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: BADGE_RADIUS, whiteSpace: 'nowrap',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
                }}>
                  {squad.testCount} caso{squad.testCount !== 1 ? 's' : ''} de teste
                </span>

                {/* Compliance badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 20, whiteSpace: 'nowrap',
                  background: compliance.bg, color: compliance.color,
                  letterSpacing: 0.3,
                }}>
                  {squad.hasTests ? '\u2705' : '\u26A0\uFE0F'} {compliance.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
