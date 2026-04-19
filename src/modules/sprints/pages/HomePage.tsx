import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SprintIndexEntry } from '../types/sprint.types'
import {
  getMasterIndex, saveMasterIndex, STORAGE_KEY,
  DEFAULT_STATE, normalizeState, saveToStorage, loadFromStorage, upsertSprintInMasterIndex,
  toggleFavoriteSprint, deleteSprintFromSupabase,
} from '../services/persistence'
import { showToast } from '@/app/components/Toast'
import { importFromJSON } from '../services/exportService'
import { uid } from '@/lib/uid'
import { listMySquads, getMySquadIds, type Squad } from '@/modules/squads/services/squadsService'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
import { useReleaseStore } from '@/modules/releases/store/releaseStore'
import type { SprintType } from '../types/sprint.types'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { SprintCard } from '../components/home/SprintCard'
import { Modal } from '../components/home/Modal'
import { FilterBar, DEFAULT_FILTERS, type Filters } from '../components/home/FilterBar'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sprintStatus(s: SprintIndexEntry): 'completed' | 'active' {
  if (s.status === 'concluida') return 'completed'
  return s.totalTests > 0 && s.totalExec >= s.totalTests ? 'completed' : 'active'
}

function sprintYear(s: SprintIndexEntry): string | null {
  if (s.startDate) return s.startDate.split('-')[0]
  if (s.endDate) return s.endDate.split('-')[0]
  return null
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function Svg({ size = 14, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
function IconPlus() { return <Svg><path d="M12 5v14M5 12h14" /></Svg> }
function IconCompare() {
  return <Svg><path d="M9 3h6v18H9z" /><path d="M3 12h6" /><path d="M15 12h6" /></Svg>
}
function IconAlertCircle({ size = 18 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Svg>
}
function IconRocket({ size = 26 }: { size?: number }) {
  return <Svg size={size}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></Svg>
}
function IconUpload() {
  return <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Svg>
}
function IconTarget({ size = 13 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>
}
function IconRefreshCw({ size = 13 }: { size?: number }) {
  return <Svg size={size}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>
}
function IconLink({ size = 13 }: { size?: number }) {
  return <Svg size={size}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Svg>
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const isAdmin = profile?.global_role === 'admin' || profile?.global_role === 'gerente'
  const activeSquadId = useActiveSquadStore((s) => s.activeSquadId)
  const allActiveSquads = useActiveSquadStore((s) => s.squads)
  const activeSquadName =
    activeSquadId && activeSquadId !== 'all'
      ? allActiveSquads.find((s) => s.id === activeSquadId)?.name
      : null

  const [sprints, setSprints] = useState<SprintIndexEntry[]>([])
  const [mySquadIds, setMySquadIds] = useState<string[] | null>(null)
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS })
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SprintIndexEntry | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newSquad, setNewSquad] = useState('')
  const [newSquadId, setNewSquadId] = useState('')
  const [availableSquads, setAvailableSquads] = useState<Squad[]>([])
  const titleInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newSprintType, setNewSprintType] = useState<SprintType>('squad')
  const [newReleaseId, setNewReleaseId] = useState('')
  const { releases: allReleases, load: loadReleases } = useReleaseStore()
  const [loading, setLoading] = useState(true)
  const [collapseCompleted, setCollapseCompleted] = useState(false)

  // Trigger criado pela Topbar via DOM (manter compatibilidade)
  useEffect(() => {
    const el = document.getElementById('create-sprint-trigger')
    if (!el) return
    const handler = () => setShowCreate(true)
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    setSprints(getMasterIndex())
    loadReleases()
    const promises: Promise<unknown>[] = [
      listMySquads().then(setAvailableSquads).catch((e) => { if (import.meta.env.DEV) console.warn('[Sprints] Failed to load squads:', e) }),
    ]
    if (!isAdmin) {
      promises.push(getMySquadIds().then(setMySquadIds).catch((e) => { if (import.meta.env.DEV) console.warn('[Sprints] Failed to load squad IDs:', e); setMySquadIds([]) }))
    }
    Promise.all(promises).finally(() => setLoading(false))
  }, []) // eslint-disable-line

  useEffect(() => {
    if (showCreate) setTimeout(() => titleInputRef.current?.focus(), 60)
  }, [showCreate])

  function reload() {
    setSprints(getMasterIndex())
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const sprintId = 'sprint_' + uid()
    const newState = structuredClone(DEFAULT_STATE)
    newState.config.title = title
    const selectedSquad = availableSquads.find((s) => s.id === newSquadId)
    newState.config.squad = selectedSquad ? selectedSquad.name : newSquad.trim()
    const normalized = normalizeState(newState)
    saveToStorage(sprintId, normalized)
    const linkedRelease = allReleases.find((r) => r.id === newReleaseId)
    upsertSprintInMasterIndex(sprintId, normalized, newSquadId || undefined, {
      sprintType: newSprintType,
      releaseId: newReleaseId || undefined,
      releaseVersion: linkedRelease?.version,
    })
    setNewTitle('')
    setNewSquad('')
    setNewSquadId('')
    setNewSprintType('squad')
    setNewReleaseId('')
    setShowCreate(false)
    navigate(`/sprints/${sprintId}`)
  }

  function handleDelete() {
    if (!deleteTarget) return
    const index = getMasterIndex().filter((s) => s.id !== deleteTarget.id)
    saveMasterIndex(index)
    localStorage.removeItem(STORAGE_KEY(deleteTarget.id))
    deleteSprintFromSupabase(deleteTarget.id).catch((e) => {
      if (import.meta.env.DEV) console.warn('[Sprints] Failed to delete from server:', e)
      showToast('Sprint removida localmente, mas não foi possível excluir do servidor', 'error')
    })
    setDeleteTarget(null)
    reload()
  }

  function handleDuplicate(sprintEntry: SprintIndexEntry) {
    const source = loadFromStorage(sprintEntry.id)
    if (!source) {
      showToast('Erro ao carregar sprint para duplicar', 'error')
      return
    }
    const newId = 'sprint_' + uid()
    const cloned = structuredClone(source)
    cloned.config.title = (source.config.title || 'Sprint') + ' (copia)'
    for (const f of cloned.features) {
      f.exec = 0
      f.execution = {}
      f.manualExecData = {}
      f.gherkinExecs = {}
      for (const c of f.cases || []) {
        c.status = 'Pendente'
        c.executionDay = ''
      }
    }
    cloned.bugs = []
    cloned.blockers = []
    cloned.reports = {}
    const normalized = normalizeState(cloned)
    saveToStorage(newId, normalized)
    upsertSprintInMasterIndex(newId, normalized, sprintEntry.squadId, {
      sprintType: sprintEntry.sprintType,
      releaseId: sprintEntry.releaseId,
      releaseVersion: sprintEntry.releaseVersion,
    })
    showToast(`"${normalized.config.title}" duplicada`, 'success')
    reload()
  }

  // DnD reorder (disabled in compareMode)
  const dragSrcId = useRef<string | null>(null)

  function onDragStart(e: React.DragEvent, id: string) {
    dragSrcId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragSrcId.current || dragSrcId.current === targetId) return
    const index = getMasterIndex()
    const src = index.findIndex((s) => s.id === dragSrcId.current)
    const dst = index.findIndex((s) => s.id === targetId)
    if (src === -1 || dst === -1) return
    const [moved] = index.splice(src, 1)
    index.splice(dst, 0, moved)
    saveMasterIndex(index)
    dragSrcId.current = null
    reload()
  }

  // Keyboard reorder (A11Y alternative to drag)
  function handleReorder(id: string, direction: -1 | 1) {
    const index = getMasterIndex()
    const src = index.findIndex((s) => s.id === id)
    if (src === -1) return
    const dst = src + direction
    if (dst < 0 || dst >= index.length) return
    const [moved] = index.splice(src, 1)
    index.splice(dst, 0, moved)
    saveMasterIndex(index)
    reload()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const sprintId = await importFromJSON(file)
      reload()
      navigate(`/sprints/${sprintId}`)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err instanceof Error ? err.message : 'Erro ao importar sprint.')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function handleToggleFavorite(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    toggleFavoriteSprint(id)
    reload()
  }

  function toggleCompareMode() {
    setCompareMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  function toggleSelectSprint(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleCardClick(sprint: SprintIndexEntry) {
    if (compareMode) {
      toggleSelectSprint(sprint.id)
    } else {
      navigate(`/sprints/${sprint.id}`)
    }
  }

  function handleCompare() {
    if (selectedIds.size < 2) return
    navigate('/sprints/compare?ids=' + [...selectedIds].join(','))
  }

  function handleClearAllFilters() {
    setFilters({ ...DEFAULT_FILTERS })
    if (activeSquadId && activeSquadId !== 'all') {
      useActiveSquadStore.getState().setActiveSquad('all').catch(() => { /* noop */ })
    }
  }

  // Sprints visíveis: admin vê tudo; demais veem sprints dos seus squads ou sem squad
  const visibleSprints = (() => {
    let visible = isAdmin || !mySquadIds
      ? sprints
      : sprints.filter((s) => !s.squadId || mySquadIds.includes(s.squadId))
    if (activeSquadId && activeSquadId !== 'all') {
      visible = visible.filter((s) => s.squadId === activeSquadId)
    }
    return visible
  })()

  const squads = [...new Set(visibleSprints.map((s) => s.squad || '').filter(Boolean))].sort()
  const years = [...new Set(visibleSprints.map(sprintYear).filter(Boolean) as string[])].sort().reverse()

  const searchTerm = filters.search.toLowerCase().trim()

  const filtered = visibleSprints.filter((s) => {
    const st = sprintStatus(s)
    if (searchTerm && !(s.title || '').toLowerCase().includes(searchTerm) && !(s.squad || '').toLowerCase().includes(searchTerm)) return false
    if (filters.squad !== 'all' && (s.squad || '') !== filters.squad) return false
    if (filters.status === 'active' && st !== 'active') return false
    if (filters.status === 'completed' && st !== 'completed') return false
    if (filters.status === 'favorite' && !s.favorite) return false
    if (filters.year !== 'all' && sprintYear(s) !== filters.year) return false
    if (filters.tipo !== 'all') {
      const tipo = s.sprintType || 'squad'
      if (tipo !== filters.tipo) return false
    }
    return true
  }).sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))

  const filteredActive = filtered.filter((s) => sprintStatus(s) === 'active')
  const filteredCompleted = filtered.filter((s) => sprintStatus(s) === 'completed')

  const hasFilters = filters.squad !== 'all' || filters.status !== 'all' || filters.year !== 'all' || filters.search !== '' || filters.tipo !== 'all'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <span style={{ color: 'var(--color-text-2)', fontSize: 13 }}>Carregando...</span>
    </div>
  )

  const TIPO_OPTIONS: { value: SprintType; label: string; desc: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { value: 'squad', label: 'Sprint Squad', desc: 'Trabalho do time', Icon: IconTarget },
    { value: 'regressivo', label: 'Regressivo', desc: 'Ligado a release', Icon: IconRefreshCw },
    { value: 'integrado', label: 'Integrado', desc: 'Features novas', Icon: IconLink },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .hp-btn-primary:hover { background: var(--color-blue-text) !important; }
        .hp-btn-outline:hover { background: var(--color-bg); }
        .hp-btn-outline-pressed {
          background: var(--color-blue-light);
          border-color: var(--color-blue);
          color: var(--color-blue-text);
        }
        .hp-btn-outline-pressed:hover { background: var(--color-blue-light); }
        .hp-btn-danger:hover { background: #b91c1c; }
        .hp-section-collapse:hover { background: var(--color-bg); color: var(--color-text); }
      `}</style>

      {/* Trigger oculto para o botão do Topbar */}
      <button id="create-sprint-trigger" onClick={() => setShowCreate(true)} style={{ display: 'none' }} aria-hidden />

      {/* Hidden import input */}
      <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Cobertura QA</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4, marginBottom: 0 }}>
            Gerencie e acompanhe a cobertura de testes das suas Sprints.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={toggleCompareMode}
            aria-pressed={compareMode}
            className={compareMode ? 'hp-btn-outline-pressed' : 'hp-btn-outline'}
            style={{
              ...btnOutline,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              ...(compareMode
                ? {
                    background: 'var(--color-blue-light)',
                    borderColor: 'var(--color-blue)',
                    color: 'var(--color-blue-text)',
                  }
                : {}),
            }}
          >
            <IconCompare /> Comparar Sprints
            {compareMode && selectedIds.size > 0 && ` (${selectedIds.size})`}
          </button>

          {compareMode ? (
            <>
              {selectedIds.size < 2 ? (
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>
                  Selecione 2 ou mais sprints
                </span>
              ) : (
                <button data-testid="sprint-btn-compare" onClick={handleCompare} style={btnPrimary} className="hp-btn-primary">
                  Comparar ({selectedIds.size})
                </button>
              )}
              <button onClick={toggleCompareMode} style={btnOutline} className="hp-btn-outline">
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setShowCreate(true)} style={btnPrimary} className="hp-btn-primary" aria-label="Criar nova sprint">
              <IconPlus /> Nova Sprint
            </button>
          )}
        </div>
      </div>

      {/* Filter bar — só aparece se há sprints */}
      {sprints.length > 0 && (
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          squads={squads}
          years={years}
          hasFilters={hasFilters}
          filteredCount={filtered.length}
          totalCount={sprints.length}
        />
      )}

      {/* Empty state: zero sprints cadastradas */}
      {sprints.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '56px 20px',
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border-md)',
            borderRadius: 14,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56, height: 56, margin: '0 auto 14px',
              borderRadius: 14,
              background: 'var(--color-blue-light)',
              color: 'var(--color-blue)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <IconRocket />
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
            Comece criando sua primeira sprint
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Acompanhe cobertura de testes, bugs, blockers e alinhamentos em um só lugar.
          </p>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <button onClick={() => setShowCreate(true)} style={btnPrimary} className="hp-btn-primary">
              <IconPlus /> Nova Sprint
            </button>
            <button onClick={() => importInputRef.current?.click()} style={btnOutline} className="hp-btn-outline">
              <IconUpload /> Importar JSON
            </button>
          </div>
        </div>
      )}

      {/* Smart empty state: há sprints mas filtros escondem tudo */}
      {sprints.length > 0 && filtered.length === 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'var(--color-amber-light)',
            border: '1px solid var(--color-amber)',
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--color-amber-mid)',
              color: '#fff',
              display: 'grid', placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <IconAlertCircle />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
              Você tem {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}, mas nenhuma corresponde aos filtros
              {activeSquadName ? ` no squad ${activeSquadName}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
              Limpe os filtros ou mude o squad ativo para ver mais sprints.
            </div>
          </div>
          <button onClick={handleClearAllFilters} style={btnOutline} className="hp-btn-outline">
            Ver todas
          </button>
        </div>
      )}

      {/* Seção: Em Andamento */}
      {filteredActive.length > 0 && (
        <>
          {filteredCompleted.length > 0 && (
            <SectionHeader title="Em andamento" count={filteredActive.length} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: filteredCompleted.length > 0 ? 18 : 0 }}>
            {filteredActive.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                compareMode={compareMode}
                isSelected={selectedIds.has(sprint.id)}
                onClick={() => handleCardClick(sprint)}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onToggleFavorite={handleToggleFavorite}
                onDuplicate={(e) => { e.stopPropagation(); handleDuplicate(sprint) }}
                onDelete={(e) => { e.stopPropagation(); setDeleteTarget(sprint) }}
                onReorder={handleReorder}
              />
            ))}
          </div>
        </>
      )}

      {/* Seção: Concluídas */}
      {filteredCompleted.length > 0 && (
        <>
          <SectionHeader
            title="Concluídas"
            count={filteredCompleted.length}
            collapsible
            collapsed={collapseCompleted}
            onToggleCollapse={() => setCollapseCompleted((v) => !v)}
          />
          {!collapseCompleted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredCompleted.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  compareMode={compareMode}
                  isSelected={selectedIds.has(sprint.id)}
                  onClick={() => handleCardClick(sprint)}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  onToggleFavorite={handleToggleFavorite}
                  onDuplicate={(e) => { e.stopPropagation(); handleDuplicate(sprint) }}
                  onDelete={(e) => { e.stopPropagation(); setDeleteTarget(sprint) }}
                  onReorder={handleReorder}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Nova Sprint */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Nova Sprint">
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="new-sprint-title">Título da Sprint *</label>
              <input
                id="new-sprint-title"
                ref={titleInputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: QA Dashboard — Sprint 12"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} id="new-sprint-tipo-label">Tipo</label>
              <div role="radiogroup" aria-label="Tipo de sprint" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TIPO_OPTIONS.map((opt) => {
                  const selected = newSprintType === opt.value
                  const Ico = opt.Icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => { setNewSprintType(opt.value); if (opt.value === 'squad') setNewReleaseId('') }}
                      className="hp-radio-card"
                      data-selected={selected ? 'true' : undefined}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                        padding: '10px 12px',
                        border: `1px solid ${selected ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                        background: selected ? 'var(--color-blue-light)' : 'var(--color-surface)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s, border-color 0.12s',
                        fontFamily: 'var(--font-family-sans)',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          display: 'grid', placeItems: 'center',
                          background: selected ? 'var(--color-blue)' : 'var(--color-surface-2)',
                          color: selected ? '#fff' : 'var(--color-text-2)',
                          transition: 'background 0.12s, color 0.12s',
                        }}
                      >
                        <Ico size={13} />
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{opt.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-3)', lineHeight: 1.35 }}>{opt.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {(newSprintType === 'regressivo' || newSprintType === 'integrado') && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle} htmlFor="new-sprint-release">Release vinculada</label>
                <select
                  id="new-sprint-release"
                  value={newReleaseId}
                  onChange={(e) => setNewReleaseId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Nenhuma release —</option>
                  {allReleases
                    .filter((r) => !['concluida', 'em_producao', 'cancelada', 'rollback', 'uniu_escopo'].includes(r.status))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.version} — {r.title}
                      </option>
                    ))}
                </select>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-3)' }}>
                  {newSprintType === 'regressivo'
                    ? 'Sprint de testes regressivos vinculada a uma release.'
                    : 'Sprint de testes integrados por features novas.'}
                </p>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="new-sprint-squad">Squad</label>
              {availableSquads.length > 0 ? (
                <select
                  id="new-sprint-squad"
                  value={newSquadId}
                  onChange={(e) => setNewSquadId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Sem squad (pessoal) —</option>
                  {availableSquads.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="new-sprint-squad"
                  type="text"
                  value={newSquad}
                  onChange={(e) => setNewSquad(e.target.value)}
                  placeholder="Ex: Checkout, Pagamentos…"
                  style={inputStyle}
                />
              )}
              {availableSquads.length === 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-3)' }}>
                  Crie um squad em Squads para vincular sprints a equipes.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={btnOutline} className="hp-btn-outline">
                Cancelar
              </button>
              <button type="submit" style={btnPrimary} className="hp-btn-primary">
                <IconPlus /> Criar Sprint
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Excluir Sprint */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="Excluir Sprint" danger>
          <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 20 }}>
            Tem certeza que deseja apagar o dashboard{' '}
            <strong>"{deleteTarget.title}"</strong>?<br />
            Todos os dados serão perdidos permanentemente.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setDeleteTarget(null)} style={btnOutline} className="hp-btn-outline">
              Cancelar
            </button>
            <button onClick={handleDelete} style={btnDanger} className="hp-btn-danger">
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
}: {
  title: string
  count: number
  collapsible?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 14px' }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</h2>
      <span
        aria-hidden="true"
        style={{
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)',
          background: 'var(--color-bg)',
          padding: '2px 8px', borderRadius: 999,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </span>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      {collapsible && (
        <button
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className="hp-section-collapse"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--color-text-2)', fontWeight: 500,
            background: 'transparent', border: 'none',
            cursor: 'pointer',
            padding: '4px 8px', borderRadius: 6,
            fontFamily: 'var(--font-family-sans)',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          <IconChevron open={!collapsed} />
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 16px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: '1px solid var(--color-blue)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  flexShrink: 0,
  transition: 'background 0.12s',
}

const btnOutline: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 16px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s, border-color 0.12s, color 0.12s',
}

const btnDanger: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--color-red)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-2)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '8px 28px 8px 10px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}
