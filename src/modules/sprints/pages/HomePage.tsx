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
    const sprintId = 'sprint_' + uid()
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
    const newId = 'sprint_' + uid()
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <span style={{ color: 'var(--color-text-2)', fontSize: 13 }}>Carregando...</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
          {compareMode ? (
            <>
              <button
                disabled
                style={{
                  ...btnOutline,
                  opacity: 0.5,
                  cursor: 'default',
                  color: 'var(--color-text-2)',
                }}
              >
                Selecione 2 ou mais sprints
              </button>
              {selectedIds.size >= 2 && (
                <button data-testid="sprint-btn-compare" onClick={handleCompare} style={btnPrimary}>
                  Comparar ({selectedIds.size})
                </button>
              )}
              <button onClick={toggleCompareMode} style={btnOutline}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleCompareMode} style={btnOutline}>
                ⚖️ Comparar Sprints
              </button>
              <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ Nova Sprint</button>
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
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: 'var(--color-text-2)',
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 14 }}>Nenhuma sprint criada ainda</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "Nova Sprint" para começar.</p>
        </div>
      )}

      {sprints.length > 0 && filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: 'var(--color-text-2)',
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 14 }}>Nenhuma sprint encontrada</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Nenhuma sprint corresponde aos filtros.</p>
        </div>
      )}

      {/* Seção: Em Andamento */}
      {filteredActive.length > 0 && (
        <>
          {filteredCompleted.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Em Andamento
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: filteredCompleted.length > 0 ? 28 : 0 }}>
            {/* Nova sprint — compact */}
            <div
              onClick={() => { if (!compareMode) setShowCreate(true) }}
              className="hp-new-sprint-hover"
              data-disabled={compareMode ? 'true' : undefined}
              style={{
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-border-md)',
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: compareMode ? 'default' : 'pointer',
                opacity: compareMode ? 0.4 : 1,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: 16, color: 'var(--color-text-3)', fontWeight: 700, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>Nova Sprint</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: filteredCompleted.length > 0 ? 28 : 16 }}>
          <div
            onClick={() => { if (!compareMode) setShowCreate(true) }}
            className="hp-new-sprint-hover"
            data-disabled={compareMode ? 'true' : undefined}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px dashed var(--color-border-md)',
              borderRadius: 10,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: compareMode ? 'default' : 'pointer',
              opacity: compareMode ? 0.4 : 1,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontSize: 16, color: 'var(--color-text-3)', fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>Nova Sprint</span>
          </div>
        </div>
      )}

      {/* Seção: Concluídas */}
      {filteredCompleted.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Concluídas
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {filteredCompleted.length} sprint{filteredCompleted.length !== 1 ? 's' : ''}
            </span>
          </div>
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
              />
            ))}
          </div>
        </>
      )}

      {/* When no filters active and sprints.length === 0, show new sprint card */}
      {sprints.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            onClick={() => setShowCreate(true)}
            className="hp-new-sprint-hover"
            style={{
              background: 'var(--color-surface)',
              border: '1.5px dashed var(--color-border-md)',
              borderRadius: 10,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontSize: 16, color: 'var(--color-text-3)', fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>Nova Sprint</span>
          </div>
        </div>
      )}

      {/* Modal: Nova Sprint */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Nova Sprint">
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Título da Sprint *</label>
              <input
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
              <label style={labelStyle}>Tipo</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { value: 'squad' as SprintType, label: 'Sprint do Squad', icon: '🎯' },
                  { value: 'regressivo' as SprintType, label: 'Regressivo', icon: '🔄' },
                  { value: 'integrado' as SprintType, label: 'Integrado', icon: '🔗' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setNewSprintType(opt.value); if (opt.value === 'squad') setNewReleaseId('') }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                      border: newSprintType === opt.value ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                      background: newSprintType === opt.value ? 'var(--color-blue-light)' : 'transparent',
                      color: newSprintType === opt.value ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Release vinculada — só para regressivo/integrado */}
            {(newSprintType === 'regressivo' || newSprintType === 'integrado') && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Release vinculada</label>
                <select
                  value={newReleaseId}
                  onChange={(e) => setNewReleaseId(e.target.value)}
                  style={selectStyle}
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
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-3)' }}>
                  {newSprintType === 'regressivo'
                    ? 'Sprint de testes regressivos vinculada a uma release.'
                    : 'Sprint de testes integrados por features novas.'}
                </p>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Squad</label>
              {availableSquads.length > 0 ? (
                <select
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
              <button type="button" onClick={() => setShowCreate(false)} style={btnOutline}>
                Cancelar
              </button>
              <button type="submit" style={btnPrimary}>
                Criar
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
            <button onClick={() => setDeleteTarget(null)} style={btnOutline}>
              Cancelar
            </button>
            <button onClick={handleDelete} style={btnDanger}>
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  flexShrink: 0,
  transition: 'all 0.15s',
}

const btnOutline: React.CSSProperties = {
  padding: '7px 16px',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
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
  transition: 'all 0.15s',
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
