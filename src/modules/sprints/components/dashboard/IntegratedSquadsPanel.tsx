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

  const conformeCount = squads.filter((s) => s.hasTests).length
  const totalCount = squads.length

  // ── Loading ──
  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{
        textAlign: 'center', padding: '24px 20px',
        color: 'var(--color-text-3)', fontSize: 13,
      }}>
        Carregando squads participantes...
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div role="alert" style={{
        padding: '12px 16px', borderRadius: 10, fontSize: 13,
        background: 'var(--color-red-light)', color: 'var(--color-red)',
        border: '1px solid var(--color-red)',
      }}>
        Erro ao carregar squads: {error}
      </div>
    )
  }

  // ── Empty ──
  if (squads.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '32px 20px',
        color: 'var(--color-text-3)', fontSize: 13,
      }}>
        Nenhum squad com PRs aprovados nesta release.
      </div>
    )
  }

  const allConforme = conformeCount === totalCount
  const pendingCount = totalCount - conformeCount

  return (
    <div role="region" aria-label="Squads participantes" style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
            Testes Integrados por Squad
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
          }}>
            {totalCount} squad{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Status geral */}
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '5px 14px',
          borderRadius: 20, whiteSpace: 'nowrap',
          background: allConforme ? 'var(--color-green-light)' : 'var(--color-amber-light)',
          color: allConforme ? 'var(--color-green)' : 'var(--color-amber)',
          border: `1px solid ${allConforme ? 'var(--color-green-mid)' : 'var(--color-amber-mid)'}`,
        }}>
          {allConforme
            ? `✅ Todos os ${totalCount} squads com testes`
            : `⚠️ ${pendingCount} de ${totalCount} squad${pendingCount !== 1 ? 's' : ''} sem testes`
          }
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 4,
        }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Progresso de cobertura</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>
            {totalCount > 0 ? Math.round((conformeCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={totalCount > 0 ? Math.round((conformeCount / totalCount) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso de cobertura de testes integrados"
          style={{
            height: 6, borderRadius: 3,
            background: 'var(--color-surface-2)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%', borderRadius: 3,
            width: totalCount > 0 ? `${(conformeCount / totalCount) * 100}%` : '0%',
            background: allConforme ? 'var(--color-green)' : 'var(--color-amber-mid)',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Squad list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {squads.map((squad) => {
          const isConforme = squad.hasTests

          return (
            <div
              key={squad.squadId}
              style={{
                padding: '10px 12px',
                background: isConforme ? 'var(--color-bg)' : 'var(--color-surface)',
                borderTop: `1px solid ${isConforme ? 'var(--color-green-mid)' : 'var(--color-border)'}`,
                borderRight: `1px solid ${isConforme ? 'var(--color-green-mid)' : 'var(--color-border)'}`,
                borderBottom: `1px solid ${isConforme ? 'var(--color-green-mid)' : 'var(--color-border)'}`,
                borderLeft: `3px solid ${isConforme ? 'var(--color-green)' : 'var(--color-amber)'}`,
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: squad.squadColor,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {squad.squadName}
                </span>
                <span style={{ fontSize: 12 }}>{isConforme ? '✅' : '⏳'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 10, background: 'var(--color-blue-light)', color: 'var(--color-blue-text)',
                }}>
                  {squad.approvedPRs} PR{squad.approvedPRs !== 1 ? 's' : ''}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 10,
                  background: isConforme ? 'var(--color-green-light)' : 'var(--color-amber-light)',
                  color: isConforme ? 'var(--color-green)' : 'var(--color-amber)',
                }}>
                  {squad.testCount > 0 ? `${squad.testCount} teste${squad.testCount !== 1 ? 's' : ''}` : 'Sem testes'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
