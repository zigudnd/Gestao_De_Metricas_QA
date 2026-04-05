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
import { listMySquads, getMySquadIds, type Squad } from '@/modules/squads/services/squadsService'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
import { useReleaseStore } from '@/modules/releases/store/releaseStore'
import type { SprintType } from '../types/sprint.types'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { SprintCard } from '../components/home/SprintCard'
import { Modal } from '../components/home/Modal'
import { FilterBar, type Filters } from '../components/home/FilterBar'

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

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const isAdmin = profile?.global_role === 'admin' || profile?.global_role === 'gerente'
  const activeSquadId = useActiveSquadStore((s) => s.activeSquadId)
  const [sprints, setSprints] = useState<SprintIndexEntry[]>([])
  const [mySquadIds, setMySquadIds] = useState<string[] | null>(null)
  const [filters, setFilters] = useState<Filters>({ squad: 'all', status: 'all', year: 'all', search: '', tipo: 'all' })
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
    const sprintId = 'sprint_' + Date.now()
    const newState = structuredClone(DEFAULT_STATE)
    newState.config.title = title
    // Se selecionou um squad, usa o nome dele como texto; senão usa campo livre
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
    deleteSprintFromSupabase(deleteTarget.id)
    setDeleteTarget(null)
    reload()
  }

  function handleDuplicate(sprintEntry: SprintIndexEntry) {
    const source = loadFromStorage(sprintEntry.id)
    if (!source) {
      showToast('Erro ao carregar sprint para duplicar', 'error')
      return
    }
    const newId = 'sprint_' + Date.now()
    const cloned = structuredClone(source)
    cloned.config.title = (source.config.title || 'Sprint') + ' (copia)'
    // Reset execution data
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

  // Sprints visíveis: admin vê tudo; demais veem sprints dos seus squads ou sem squad
  const visibleSprints = (() => {
    let visible = isAdmin || !mySquadIds
      ? sprints
      : sprints.filter((s) => !s.squadId || mySquadIds.includes(s.squadId))
    // Filtrar pelo squad ativo no seletor (se não for "all")
    if (activeSquadId && activeSquadId !== 'all') {
      visible = visible.filter((s) => s.squadId === activeSquadId)
    }
    return visible
  })()

  // Filter options
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
    <div className="flex items-center justify-center h-[120px]">
      <span className="text-[var(--color-text-2)] text-[13px]">Carregando...</span>
    </div>
  )

  return (
    <div className="max-w-[1100px] mx-auto">
      <style>{`
        .hp-new-sprint-hover:not([data-disabled="true"]):hover { border-color: var(--color-blue) !important; background: var(--color-blue-light) !important; }
        .hp-fav-hover:not([data-active="true"]):hover { background: var(--color-amber-light); border-color: var(--color-amber-mid); color: var(--color-amber-mid); }
        .hp-btn-blue:hover { background: var(--color-blue-light); border-color: var(--color-blue); color: var(--color-blue-text); }
        .hp-btn-red:hover { background: var(--color-red-light); border-color: var(--color-red-mid); color: var(--color-red); }
        .hp-card-hover:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }
        .hp-card-hover:hover .hp-drag-handle { opacity: 0.7 !important; }
        .hp-card-hover:hover .hp-actions { opacity: 1 !important; }
      `}</style>
      {/* Trigger oculto para o botão do Topbar */}
      <button id="create-sprint-trigger" onClick={() => setShowCreate(true)} className="hidden" aria-hidden />

      {/* Hidden import input */}
      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="heading-lg !text-xl">Cobertura QA</h1>
          <p className="text-body mt-1">
            Gerencie e acompanhe a cobertura de testes das suas Sprints.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {compareMode ? (
            <>
              <button
                disabled
                className="btn btn-outline btn-md opacity-50 !cursor-default text-[var(--color-text-2)]"
              >
                Selecione 2 ou mais sprints
              </button>
              {selectedIds.size >= 2 && (
                <button data-testid="sprint-btn-compare" onClick={handleCompare} className="btn btn-primary btn-md font-semibold">
                  Comparar ({selectedIds.size})
                </button>
              )}
              <button onClick={toggleCompareMode} className="btn btn-outline btn-md">
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleCompareMode} className="btn btn-outline btn-md">
                ⚖️ Comparar Sprints
              </button>
              <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-md font-semibold">+ Nova Sprint</button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
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

      {/* Empty state */}
      {sprints.length === 0 && (
        <div className="text-center py-12 px-5 text-[var(--color-text-2)]">
          <p className="font-semibold text-sm">Nenhuma sprint criada ainda</p>
          <p className="text-[13px] mt-1">Clique em "Nova Sprint" para começar.</p>
        </div>
      )}

      {sprints.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 px-5 text-[var(--color-text-2)]">
          <p className="font-semibold text-sm">Nenhuma sprint encontrada</p>
          <p className="text-[13px] mt-1">Nenhuma sprint corresponde aos filtros.</p>
        </div>
      )}

      {/* Seção: Em Andamento */}
      {filteredActive.length > 0 && (
        <>
          {filteredCompleted.length > 0 && (
            <div className="mb-3">
              <span className="section-label">
                Em Andamento
              </span>
            </div>
          )}
          <div className={`flex flex-col gap-1.5 ${filteredCompleted.length > 0 ? 'mb-7' : ''}`}>
            {/* Nova sprint — compact */}
            <div
              onClick={() => { if (!compareMode) setShowCreate(true) }}
              className="hp-new-sprint-hover flex items-center gap-2.5 rounded-[10px] p-[10px_16px] bg-[var(--color-surface)] border-[1.5px] border-dashed border-[var(--color-border-md)] transition-[border-color,background] duration-150"
              style={{
                cursor: compareMode ? 'default' : 'pointer',
                opacity: compareMode ? 0.4 : 1,
              }}
              data-disabled={compareMode ? 'true' : undefined}
            >
              <span className="text-base text-[var(--color-text-3)] font-bold leading-none">+</span>
              <span className="text-[13px] font-semibold text-[var(--color-text-2)]">Nova Sprint</span>
            </div>

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
              />
            ))}
          </div>
        </>
      )}

      {/* Nova sprint card quando não há sprints ativas */}
      {filteredActive.length === 0 && sprints.length > 0 && filtered.length > 0 && (
        <div className={`flex flex-col gap-1.5 ${filteredCompleted.length > 0 ? 'mb-7' : 'mb-4'}`}>
          <div
            onClick={() => { if (!compareMode) setShowCreate(true) }}
            className="hp-new-sprint-hover flex items-center gap-2.5 rounded-[10px] p-[10px_16px] bg-[var(--color-surface)] border-[1.5px] border-dashed border-[var(--color-border-md)] transition-[border-color,background] duration-150"
            style={{
              cursor: compareMode ? 'default' : 'pointer',
              opacity: compareMode ? 0.4 : 1,
            }}
            data-disabled={compareMode ? 'true' : undefined}
          >
            <span className="text-base text-[var(--color-text-3)] font-bold leading-none">+</span>
            <span className="text-[13px] font-semibold text-[var(--color-text-2)]">Nova Sprint</span>
          </div>
        </div>
      )}

      {/* Seção: Concluídas */}
      {filteredCompleted.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className="section-label !mb-0">
              Concluídas
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[11px] text-[var(--color-text-3)]">
              {filteredCompleted.length} sprint{filteredCompleted.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
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
              />
            ))}
          </div>
        </>
      )}

      {/* When no filters active and sprints.length === 0, show new sprint card */}
      {sprints.length === 0 && (
        <div className="flex flex-col gap-1.5">
          <div
            onClick={() => setShowCreate(true)}
            className="hp-new-sprint-hover flex items-center gap-2.5 rounded-[10px] p-[10px_16px] bg-[var(--color-surface)] border-[1.5px] border-dashed border-[var(--color-border-md)] cursor-pointer transition-[border-color,background] duration-150"
          >
            <span className="text-base text-[var(--color-text-3)] font-bold leading-none">+</span>
            <span className="text-[13px] font-semibold text-[var(--color-text-2)]">Nova Sprint</span>
          </div>
        </div>
      )}

      {/* Modal: Nova Sprint */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Nova Sprint">
          <form onSubmit={handleCreate}>
            <div className="mb-3.5">
              <label className="label-field">Título da Sprint *</label>
              <input
                ref={titleInputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: QA Dashboard — Sprint 12"
                required
                className="input-field"
              />
            </div>
            <div className="mb-3.5">
              <label className="label-field">Tipo</label>
              <div className="flex gap-1.5">
                {([
                  { value: 'squad' as SprintType, label: 'Sprint do Squad', icon: '🎯' },
                  { value: 'regressivo' as SprintType, label: 'Regressivo', icon: '🔄' },
                  { value: 'integrado' as SprintType, label: 'Integrado', icon: '🔗' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setNewSprintType(opt.value); if (opt.value === 'squad') setNewReleaseId('') }}
                    className={`flex-1 py-2 rounded-[7px] text-xs font-semibold cursor-pointer transition-all duration-150 ${
                      newSprintType === opt.value
                        ? 'border-2 border-[var(--color-blue)] bg-[var(--color-blue-light)] text-[var(--color-blue-text)]'
                        : 'border border-[var(--color-border-md)] bg-transparent text-[var(--color-text-2)]'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Release vinculada — só para regressivo/integrado */}
            {(newSprintType === 'regressivo' || newSprintType === 'integrado') && (
              <div className="mb-3.5">
                <label className="label-field">Release vinculada</label>
                <select
                  value={newReleaseId}
                  onChange={(e) => setNewReleaseId(e.target.value)}
                  className="select-field"
                >
                  <option value="">— Nenhuma release —</option>
                  {allReleases
                    .filter((r) => r.status !== 'concluida')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.version} — {r.title}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--color-text-3)]">
                  {newSprintType === 'regressivo'
                    ? 'Sprint de testes regressivos vinculada a uma release.'
                    : 'Sprint de testes integrados por features novas.'}
                </p>
              </div>
            )}

            <div className="mb-5">
              <label className="label-field">Squad</label>
              {availableSquads.length > 0 ? (
                <select
                  value={newSquadId}
                  onChange={(e) => setNewSquadId(e.target.value)}
                  className="select-field"
                >
                  <option value="">— Sem squad (pessoal) —</option>
                  {availableSquads.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newSquad}
                  onChange={(e) => setNewSquad(e.target.value)}
                  placeholder="Ex: Checkout, Pagamentos…"
                  className="input-field"
                />
              )}
              {availableSquads.length === 0 && (
                <p className="mt-1 text-[11px] text-[var(--color-text-3)]">
                  Crie um squad em Squads para vincular sprints a equipes.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline btn-md">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-md font-semibold">
                Criar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Excluir Sprint */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="Excluir Sprint" danger>
          <p className="text-body mb-5">
            Tem certeza que deseja apagar o dashboard{' '}
            <strong>"{deleteTarget.title}"</strong>?<br />
            Todos os dados serão perdidos permanentemente.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-outline btn-md">
              Cancelar
            </button>
            <button onClick={handleDelete} className="btn btn-danger btn-md font-semibold">
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
