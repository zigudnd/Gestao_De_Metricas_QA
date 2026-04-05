import { useState, useMemo } from 'react'
import type { Release } from '../../types/release.types'
import type { SprintIndexEntry } from '@/modules/sprints/types/sprint.types'
import { getMasterIndex, loadFromStorage } from '@/modules/sprints/services/persistence'
import type { SprintState } from '@/modules/sprints/types/sprint.types'

interface RegressivosTabProps {
  releases: Release[]
  onReleaseClick: (id: string) => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface SuiteDetail {
  id: number
  name: string
  totalTests: number
  executed: number
  passed: number
  failed: number
  blocked: number
  pending: number
  execPct: number
}

interface SprintDetail {
  id: string
  title: string
  squad: string
  sprintType: string
  totalTests: number
  executed: number
  passed: number
  failed: number
  blocked: number
  pending: number
  execPct: number
  openBugs: number
  suites: SuiteDetail[]
}

interface RegressivoRow {
  releaseId: string
  releaseTitle: string
  version: string
  platform: string
  productionDate: string
  daysLeft: number
  totalTests: number
  executedTests: number
  execPct: number
  execStr: string
  passed: number
  failed: number
  blocked: number
  pending: number
  openBugs: number
  status: 'bloqueado' | 'andamento' | 'liberado' | 'pendente'
  sprints: SprintIndexEntry[]
  squadsNaoCadastrados: string[]
}

type FilterValue = 'todos' | 'bloqueado' | 'andamento' | 'liberado' | 'pendente'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function fmtDate(iso: string): string {
  if (!iso) return '--'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function inferPlatform(sprint: SprintIndexEntry): string {
  const t = (sprint.title + ' ' + sprint.squad).toLowerCase()
  if (t.includes('ios')) return 'iOS'
  if (t.includes('android')) return 'Android'
  if (t.includes('bff')) return 'BFF'
  if (t.includes('back')) return 'Back'
  if (t.includes('front')) return 'Front'
  return 'Geral'
}

function computeSprintDetail(sprintId: string, entry: SprintIndexEntry): SprintDetail {
  const state = loadFromStorage(sprintId) as SprintState | null
  if (!state) {
    return {
      id: sprintId, title: entry.title, squad: entry.squad,
      sprintType: entry.sprintType || 'squad',
      totalTests: entry.totalTests, executed: entry.totalExec,
      passed: 0, failed: 0, blocked: 0, pending: entry.totalTests - entry.totalExec,
      execPct: entry.totalTests > 0 ? Math.round(entry.totalExec / entry.totalTests * 100) : 0,
      openBugs: 0, suites: [],
    }
  }

  // Compute per-suite metrics
  const suiteMap = new Map<number, SuiteDetail>()
  for (const suite of (state.suites || [])) {
    suiteMap.set(suite.id, {
      id: suite.id, name: suite.name,
      totalTests: 0, executed: 0, passed: 0, failed: 0, blocked: 0, pending: 0, execPct: 0,
    })
  }

  let passed = 0, failed = 0, blocked = 0, pending = 0
  for (const f of state.features) {
    const sd = suiteMap.get(f.suiteId)
    for (const c of f.cases || []) {
      if (c.status === 'Concluído') { passed++; if (sd) { sd.passed++; sd.executed++; sd.totalTests++ } }
      else if (c.status === 'Falhou') { failed++; if (sd) { sd.failed++; sd.executed++; sd.totalTests++ } }
      else if (c.status === 'Bloqueado') { blocked++; if (sd) { sd.blocked++; sd.totalTests++ } }
      else { pending++; if (sd) { sd.pending++; sd.totalTests++ } }
    }
  }

  // Compute suite percentages
  for (const sd of suiteMap.values()) {
    sd.execPct = sd.totalTests > 0 ? Math.round(sd.executed / sd.totalTests * 100) : 0
  }

  const total = passed + failed + blocked + pending
  const executed = passed + failed
  const openBugs = (state.bugs || []).filter((b) => b.status !== 'Resolvido').length
  const suites = [...suiteMap.values()].filter((s) => s.totalTests > 0)
  return {
    id: sprintId, title: entry.title, squad: entry.squad,
    sprintType: entry.sprintType || 'squad',
    totalTests: total || entry.totalTests,
    executed: executed || entry.totalExec,
    passed, failed, blocked, pending,
    execPct: total > 0 ? Math.round(executed / total * 100) : 0,
    openBugs,
    suites,
  }
}

function computeStatus(execPct: number, daysLeft: number, sprints: SprintIndexEntry[]): RegressivoRow['status'] {
  const allConcluded = sprints.length > 0 && sprints.every((s) => s.status === 'concluida')
  if (allConcluded || execPct >= 100) return 'liberado'
  if (execPct === 0) return 'pendente'
  if (daysLeft <= 3 && execPct < 80) return 'bloqueado'
  return 'andamento'
}

const STATUS_LABELS = {
  bloqueado: 'Bloqueado', andamento: 'Em andamento', liberado: 'Liberado', pendente: 'Pendente',
}

const STATUS_COLORS = {
  bloqueado: 'var(--color-red)', andamento: 'var(--color-amber-mid)',
  liberado: 'var(--color-green)', pendente: 'var(--color-text-3)',
}

const STATUS_BG_COLORS = {
  bloqueado: 'var(--color-red-light)', andamento: 'var(--color-amber-light)',
  liberado: 'var(--color-green-light)', pendente: 'var(--color-surface-2)',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RegressivosTab({ releases, onReleaseClick }: RegressivosTabProps) {
  const [filter, setFilter] = useState<FilterValue>('todos')
  const [search, setSearch] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Cache all sprint details so each sprint is loaded from localStorage only once per render
  const sprintDetailsCache = useMemo(() => {
    const cache = new Map<string, SprintDetail>()
    const allSprints = getMasterIndex()
    for (const release of releases.filter((r) => r.status !== 'concluida')) {
      const linked = allSprints.filter(
        (s) => s.releaseId === release.id && (s.sprintType === 'regressivo' || s.sprintType === 'integrado'),
      )
      for (const sp of linked) {
        if (!cache.has(sp.id)) {
          cache.set(sp.id, computeSprintDetail(sp.id, sp))
        }
      }
    }
    return cache
  }, [releases])

  // Build rows from releases + linked sprints
  const rows = useMemo<RegressivoRow[]>(() => {
    const allSprints = getMasterIndex()
    const activeReleases = releases.filter((r) => r.status !== 'concluida')
    const result: RegressivoRow[] = []

    for (const release of activeReleases) {
      // Find sprints linked to this release (regressivo + integrado)
      const linkedSprints = allSprints.filter(
        (s) => s.releaseId === release.id && (s.sprintType === 'regressivo' || s.sprintType === 'integrado'),
      )

      if (linkedSprints.length === 0 && release.squads.length === 0) continue

      // Aggregate metrics from linked sprints (detailed)
      const details = linkedSprints.map((s) => sprintDetailsCache.get(s.id) || computeSprintDetail(s.id, s))
      const totalTests = details.reduce((a, d) => a + d.totalTests, 0)
      const executedTests = details.reduce((a, d) => a + d.executed, 0)
      const passed = details.reduce((a, d) => a + d.passed, 0)
      const failed = details.reduce((a, d) => a + d.failed, 0)
      const blocked = details.reduce((a, d) => a + d.blocked, 0)
      const pending = details.reduce((a, d) => a + d.pending, 0)
      const openBugs = details.reduce((a, d) => a + d.openBugs, 0)
      const execPct = totalTests > 0 ? Math.round(executedTests / totalTests * 100) : 0
      const dLeft = daysUntil(release.productionDate)

      // Squads da release que não têm sprint vinculada
      const linkedSquadNames = new Set(linkedSprints.map((s) => s.squad))
      const squadsNaoCadastrados = release.squads
        .filter((sq) => !linkedSquadNames.has(sq.squadName))
        .map((sq) => sq.squadName)

      // Infer platform
      const platforms = [...new Set(linkedSprints.map(inferPlatform))]
      const platform = platforms.length > 0 ? platforms.join(', ') : release.platforms?.join(', ') || 'Geral'

      result.push({
        releaseId: release.id,
        releaseTitle: release.title,
        version: release.version,
        platform,
        productionDate: release.productionDate,
        daysLeft: dLeft,
        totalTests,
        executedTests,
        execPct,
        execStr: `${executedTests}/${totalTests}`,
        passed, failed, blocked, pending, openBugs,
        status: computeStatus(execPct, dLeft, linkedSprints),
        sprints: linkedSprints,
        squadsNaoCadastrados,
      })
    }

    return result.sort((a, b) => a.daysLeft - b.daysLeft)
  }, [releases, sprintDetailsCache])

  // Filter + search
  const filtered = useMemo(() => {
    let list = rows
    if (filter !== 'todos') list = list.filter((r) => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        r.version.toLowerCase().includes(q) ||
        r.releaseTitle.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q) ||
        r.sprints.some((s) => s.title.toLowerCase().includes(q) || s.squad.toLowerCase().includes(q)),
      )
    }
    return list
  }, [rows, filter, search])

  // KPIs
  const kpis = {
    total: rows.length,
    bloqueado: rows.filter((r) => r.status === 'bloqueado').length,
    andamento: rows.filter((r) => r.status === 'andamento').length,
    liberado: rows.filter((r) => r.status === 'liberado').length,
  }

  function progColor(pct: number): string {
    if (pct >= 100) return 'var(--color-green)'
    if (pct >= 60) return 'var(--color-amber-mid)'
    return 'var(--color-red)'
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3.5">
        <span className="section-label" style={{ marginBottom: 0 }}>
          Filtrar:
        </span>
        {(['todos', 'bloqueado', 'andamento', 'liberado'] as FilterValue[]).map((f) => (
          <button key={f} onClick={() => { setFilter(f); setExpandedIdx(null) }} style={{
            padding: '4px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            border: filter === f ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border-md)',
            background: filter === f ? 'var(--color-blue-light)' : 'var(--color-surface)',
            color: filter === f ? 'var(--color-blue-text)' : 'var(--color-text-2)',
            cursor: 'pointer', fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
          }}>
            {f === 'todos' ? 'Todos' : STATUS_LABELS[f]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border-md)', borderRadius: 7, padding: '4px 10px', background: 'var(--color-surface)' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar versao, squad..."
            style={{ border: 'none', outline: 'none', fontSize: 12, color: 'var(--color-text)', background: 'transparent', width: 150, fontFamily: 'var(--font-family-sans)' }} />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Versoes ativas', value: kpis.total, color: 'var(--color-blue)', sub: 'com regressivo' },
          { label: 'Bloqueadas', value: kpis.bloqueado, color: 'var(--color-red)', sub: 'impeditivos' },
          { label: 'Em andamento', value: kpis.andamento, color: 'var(--color-amber-mid)', sub: 'em progresso' },
          { label: 'Liberadas', value: kpis.liberado, color: 'var(--color-green)', sub: 'prontas' },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderLeft: `3px solid ${kpi.color}`, borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--color-text-2)', marginBottom: 5 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 3 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔄</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 4px' }}>
            {rows.length === 0 ? 'Nenhuma release com regressivo vinculado' : 'Nenhum resultado para este filtro'}
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            {rows.length === 0 ? 'Crie sprints de regressivo/integrado em Cobertura QA e vincule a uma release.' : 'Tente outro filtro ou busca.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '140px 80px 1fr 90px 100px 90px 36px',
            padding: '10px 14px', background: 'var(--color-surface-2)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.35px', color: 'var(--color-text-2)',
          }}>
            <span>Versão</span>
            <span>Plataforma</span>
            <span>Execucao regressivo</span>
            <span>Sprints</span>
            <span>Status</span>
            <span>Produção</span>
            <span />
          </div>

          {/* Rows */}
          {filtered.map((row, idx) => {
            const isOpen = expandedIdx === idx
            const clr = progColor(row.execPct)
            const stColor = STATUS_COLORS[row.status]
            const dateCls = row.daysLeft <= 3 ? 'var(--color-red)' : row.daysLeft <= 7 ? 'var(--color-amber-mid)' : 'var(--color-text)'

            return (
              <div key={row.releaseId}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedIdx(isOpen ? null : idx)}
                  className={isOpen ? '' : 'regressivos-row'}
                  style={{
                    display: 'grid', gridTemplateColumns: '140px 80px 1fr 90px 100px 90px 36px',
                    padding: '11px 14px', borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center',
                    background: isOpen ? 'var(--color-blue-light)' : 'var(--color-surface)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{row.version}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{row.releaseTitle}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{row.platform}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${row.execPct}%`, background: clr, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32, textAlign: 'right', color: clr }}>{row.execPct}%</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2 }}>{row.execStr} testes</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-family-mono)' }}>{row.sprints.length}</span>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20,
                    background: STATUS_BG_COLORS[row.status], color: stColor, whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABELS[row.status]}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, color: dateCls, fontWeight: row.daysLeft <= 7 ? 700 : 400 }}>{fmtDate(row.productionDate)}</div>
                    {row.daysLeft <= 10 && (
                      <div style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>{row.daysLeft}d para subida</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, color: isOpen ? 'var(--color-blue)' : 'var(--color-text-3)',
                    display: 'inline-block', transition: 'transform 0.18s',
                    transform: isOpen ? 'rotate(180deg)' : 'none', textAlign: 'center',
                  }}>▾</span>
                </div>

                {/* Expanded detail with full metrics */}
                {isOpen && (
                  <div style={{ padding: '16px 18px', background: 'var(--color-blue-light)', borderBottom: '1px solid var(--color-border)' }}>
                    {/* KPIs detalhados */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
                      {[
                        { label: 'Total', value: row.totalTests, color: 'var(--color-text)' },
                        { label: 'Executados', value: row.executedTests, color: 'var(--color-blue)' },
                        { label: 'Concluidos', value: row.passed, color: 'var(--color-green)' },
                        { label: 'Falhas', value: row.failed, color: 'var(--color-red)' },
                        { label: 'Bloqueados', value: row.blocked, color: 'var(--color-amber-mid)' },
                        { label: 'Pendentes', value: row.pending, color: 'var(--color-text-3)' },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{
                          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, fontFamily: 'var(--font-family-mono)', lineHeight: 1 }}>
                            {kpi.value}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.3px' }}>
                            {kpi.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bugs abertos */}
                    {row.openBugs > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--color-red-light)', border: '1px solid var(--color-red)',
                        marginBottom: 14, fontSize: 12, color: 'var(--color-red)', fontWeight: 600,
                      }}>
                        <span style={{ fontSize: 14 }}>!</span>
                        {row.openBugs} bug{row.openBugs !== 1 ? 's' : ''} aberto{row.openBugs !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Sprints vinculadas */}
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.45px', color: 'var(--color-text-2)', marginBottom: 10 }}>
                      Sprints vinculadas ({row.sprints.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                      {row.sprints.map((sp) => {
                        const detail = sprintDetailsCache.get(sp.id)!
                        const spClr = progColor(detail.execPct)
                        const squadLabel = sp.squad || sp.title
                        const isConcluida = sp.status === 'concluida'
                        return (
                          <div key={sp.id} style={{
                            background: isConcluida ? 'var(--color-green-light)' : 'var(--color-surface)',
                            border: isConcluida ? '1.5px solid var(--color-green)' : '1px solid var(--color-border)',
                            borderRadius: 10, overflow: 'hidden',
                          }}>
                            {/* Header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
                              background: isConcluida ? 'var(--color-green-light)' : 'var(--color-bg)',
                            }}>
                              {isConcluida && (
                                <span style={{ fontSize: 12, flexShrink: 0 }}>✅</span>
                              )}
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sp.title}
                              </span>
                              {isConcluida && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                                  background: 'var(--color-green)', color: '#fff', flexShrink: 0,
                                }}>
                                  CONCLUIDA
                                </span>
                              )}
                              {sp.sprintType && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                                  background: sp.sprintType === 'regressivo' ? 'var(--color-amber-light)' : 'var(--color-blue-light)',
                                  color: sp.sprintType === 'regressivo' ? 'var(--color-amber)' : 'var(--color-blue-text)',
                                  flexShrink: 0,
                                }}>
                                  {sp.sprintType === 'regressivo' ? 'REG' : 'INT'}
                                </span>
                              )}
                            </div>

                            <div style={{ padding: '10px 12px' }}>
                              {/* Squad name */}
                              <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginBottom: 8, fontWeight: 500 }}>
                                {squadLabel}
                              </div>

                              {/* Progress bar */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ flex: 1, height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: 3, width: `${detail.execPct}%`, background: spClr, transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: spClr, fontFamily: 'var(--font-family-mono)', minWidth: 36, textAlign: 'right' }}>
                                  {detail.execPct}%
                                </span>
                              </div>

                              {/* Counters — grid 2x2 */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 10, fontSize: 11 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--color-text-3)' }}>Concluidos</span>
                                  <span style={{ fontWeight: 700, color: detail.passed > 0 ? 'var(--color-green)' : 'var(--color-text-3)', fontFamily: 'var(--font-family-mono)' }}>{detail.passed}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--color-text-3)' }}>Falhas</span>
                                  <span style={{ fontWeight: 700, color: detail.failed > 0 ? 'var(--color-red)' : 'var(--color-text-3)', fontFamily: 'var(--font-family-mono)' }}>{detail.failed}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--color-text-3)' }}>Bloqueados</span>
                                  <span style={{ fontWeight: 700, color: detail.blocked > 0 ? 'var(--color-amber-mid)' : 'var(--color-text-3)', fontFamily: 'var(--font-family-mono)' }}>{detail.blocked}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--color-text-3)' }}>Pendentes</span>
                                  <span style={{ fontWeight: 700, color: 'var(--color-text-2)', fontFamily: 'var(--font-family-mono)' }}>{detail.pending}</span>
                                </div>
                              </div>

                              {/* Bugs */}
                              {detail.openBugs > 0 && (
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '5px 8px', borderRadius: 6,
                                  background: 'var(--color-red-light)',
                                  fontSize: 10, color: 'var(--color-red)', fontWeight: 600,
                                  marginBottom: 10,
                                }}>
                                  <span>!</span> {detail.openBugs} bug{detail.openBugs !== 1 ? 's' : ''} aberto{detail.openBugs !== 1 ? 's' : ''}
                                </div>
                              )}

                              {/* Suites */}
                              {detail.suites.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>
                                    Suites ({detail.suites.length})
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {detail.suites.map((suite) => {
                                      const sClr = progColor(suite.execPct)
                                      return (
                                        <div key={suite.id} style={{
                                          padding: '6px 8px', borderRadius: 6,
                                          background: 'var(--color-bg)',
                                          border: '0.5px solid var(--color-border)',
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                              {suite.name}
                                            </span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: sClr, fontFamily: 'var(--font-family-mono)', flexShrink: 0, marginLeft: 8 }}>
                                              {suite.execPct}%
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <div style={{ flex: 1, height: 4, background: 'var(--color-surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                                              <div style={{ height: '100%', borderRadius: 2, width: `${suite.execPct}%`, background: sClr }} />
                                            </div>
                                            <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontFamily: 'var(--font-family-mono)', flexShrink: 0 }}>
                                              {suite.executed}/{suite.totalTests}
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
                                            {suite.passed > 0 && <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>{suite.passed} ok</span>}
                                            {suite.failed > 0 && <span style={{ color: 'var(--color-red)', fontWeight: 600 }}>{suite.failed} falha</span>}
                                            {suite.blocked > 0 && <span style={{ color: 'var(--color-amber-mid)', fontWeight: 600 }}>{suite.blocked} bloq.</span>}
                                            {suite.pending > 0 && <span style={{ color: 'var(--color-text-3)' }}>{suite.pending} pend.</span>}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Squads sem suíte */}
                    {row.squadsNaoCadastrados.length > 0 && (
                      <div style={{
                        background: 'var(--color-surface)', border: '1px dashed var(--color-border-md)',
                        borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-2)', fontStyle: 'italic',
                        marginBottom: 10,
                      }}>
                        <strong style={{ fontStyle: 'normal', color: 'var(--color-text)' }}>Sem suite cadastrada:</strong>{' '}
                        {row.squadsNaoCadastrados.join(', ')}
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                      <button onClick={() => onReleaseClick(row.releaseId)} className="btn btn-sm btn-outline" style={{ border: '1px solid var(--color-blue)', color: 'var(--color-blue)' }}>
                        Abrir release completa
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                        {row.sprints.length} sprint(s) · {row.squadsNaoCadastrados.length} sem suite · {row.openBugs} bug(s) aberto(s)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <style>{`
        .regressivos-row:hover { background: var(--color-blue-light) !important; }
      `}</style>
    </div>
  )
}
