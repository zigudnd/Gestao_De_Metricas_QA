import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SprintIndexEntry } from '../types/sprint.types'
import {
  getMasterIndex, saveMasterIndex, STORAGE_KEY,
  DEFAULT_STATE, normalizeState, saveToStorage, upsertSprintInMasterIndex,
  toggleFavoriteSprint, deleteSprintFromSupabase,
} from '../services/persistence'
import { importFromJSON } from '../services/exportService'
import { listMySquads, getMySquadIds, type Squad } from '@/modules/squads/services/squadsService'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
import { useAuthStore } from '@/modules/auth/store/authStore'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateBR(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

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

interface Filters {
  squad: string
  status: 'all' | 'active' | 'completed' | 'favorite'
  year: string
  search: string
}

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const isAdmin = profile?.global_role === 'admin' || profile?.global_role === 'gerente'
  const activeSquadId = useActiveSquadStore((s) => s.activeSquadId)
  const [sprints, setSprints] = useState<SprintIndexEntry[]>([])
  const [mySquadIds, setMySquadIds] = useState<string[] | null>(null)
  const [filters, setFilters] = useState<Filters>({ squad: 'all', status: 'all', year: 'all', search: '' })
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
    listMySquads().then(setAvailableSquads).catch(() => {})
    if (!isAdmin) {
      getMySquadIds().then(setMySquadIds).catch(() => setMySquadIds([]))
    }
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
    const newState = JSON.parse(JSON.stringify(DEFAULT_STATE))
    newState.config.title = title
    // Se selecionou um squad, usa o nome dele como texto; senão usa campo livre
    const selectedSquad = availableSquads.find((s) => s.id === newSquadId)
    newState.config.squad = selectedSquad ? selectedSquad.name : newSquad.trim()
    const normalized = normalizeState(newState)
    saveToStorage(sprintId, normalized)
    upsertSprintInMasterIndex(sprintId, normalized, newSquadId || undefined)
    setNewTitle('')
    setNewSquad('')
    setNewSquadId('')
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
      alert(err instanceof Error ? err.message : 'Erro ao importar sprint.')
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
    return true
  }).sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))

  const filteredActive = filtered.filter((s) => sprintStatus(s) === 'active')
  const filteredCompleted = filtered.filter((s) => sprintStatus(s) === 'completed')

  const hasFilters = filters.squad !== 'all' || filters.status !== 'all' || filters.year !== 'all' || filters.search !== ''

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
                <button onClick={handleCompare} style={btnPrimary}>
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          <div style={{ position: 'relative', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-3)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar sprint..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid var(--color-border-md)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />

          <FilterGroup
            label="Squad"
            value={filters.squad}
            onChange={(v) => setFilters((f) => ({ ...f, squad: v }))}
          >
            <option value="all">Todos</option>
            {squads.map((sq) => (
              <option key={sq} value={sq}>{sq}</option>
            ))}
          </FilterGroup>

          <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />

          <FilterGroup
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters['status'] }))}
          >
            <option value="all">Todos</option>
            <option value="active">Em Andamento</option>
            <option value="completed">Concluída</option>
            <option value="favorite">⭐ Favoritas</option>
          </FilterGroup>

          {years.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
              <FilterGroup
                label="Ano"
                value={filters.year}
                onChange={(v) => setFilters((f) => ({ ...f, year: v }))}
              >
                <option value="all">Todos</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </FilterGroup>
            </>
          )}

          {hasFilters && (
            <button
              onClick={() => setFilters({ squad: 'all', status: 'all', year: 'all', search: '' })}
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid var(--color-border-md)',
                background: 'transparent',
                color: 'var(--color-text-2)',
                cursor: 'pointer',
              }}
            >
              ✕ Limpar
            </button>
          )}

          <span
            style={{
              marginLeft: hasFilters ? 0 : 'auto',
              fontSize: 12,
              color: 'var(--color-text-3)',
            }}
          >
            {hasFilters
              ? `${filtered.length} de ${sprints.length} sprints`
              : `${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}`}
          </span>
        </div>
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
              onMouseEnter={(e) => {
                if (compareMode) return
                e.currentTarget.style.borderColor = 'var(--color-blue)'
                e.currentTarget.style.background = 'var(--color-blue-light)'
              }}
              onMouseLeave={(e) => {
                if (compareMode) return
                e.currentTarget.style.borderColor = 'var(--color-border-md)'
                e.currentTarget.style.background = 'var(--color-surface)'
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
            onMouseEnter={(e) => {
              if (compareMode) return
              e.currentTarget.style.borderColor = 'var(--color-blue)'
              e.currentTarget.style.background = 'var(--color-blue-light)'
            }}
            onMouseLeave={(e) => {
              if (compareMode) return
              e.currentTarget.style.borderColor = 'var(--color-border-md)'
              e.currentTarget.style.background = 'var(--color-surface)'
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
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-blue)'
              e.currentTarget.style.background = 'var(--color-blue-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-md)'
              e.currentTarget.style.background = 'var(--color-surface)'
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

// ─── SprintCard (compact list style) ──────────────────────────────────────────

interface SprintCardProps {
  sprint: SprintIndexEntry
  compareMode: boolean
  isSelected: boolean
  onClick: () => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onToggleFavorite: (e: React.MouseEvent, id: string) => void
  onDelete: (e: React.MouseEvent) => void
}

function SprintCard({
  sprint,
  compareMode,
  isSelected,
  onClick,
  onDragStart,
  onDrop,
  onToggleFavorite,
  onDelete,
}: SprintCardProps) {
  const [hovered, setHovered] = useState(false)
  const status = sprintStatus(sprint)
  const pct = sprint.totalTests > 0 ? Math.round((sprint.totalExec / sprint.totalTests) * 100) : 0
  const period =
    sprint.startDate && sprint.endDate
      ? `${formatDateBR(sprint.startDate)} — ${formatDateBR(sprint.endDate)}`
      : 'Período não definido'

  const dotColor = status === 'completed' ? 'var(--color-green)' : 'var(--color-blue)'

  const subtitle = [
    sprint.squad,
    period,
    `${pct}% · ${sprint.totalExec}/${sprint.totalTests} testes`,
  ].filter(Boolean).join('  ·  ')

  return (
    <div
      onClick={onClick}
      onDragOver={(e) => { if (!compareMode) e.preventDefault() }}
      onDrop={(e) => { if (!compareMode) onDrop(e, sprint.id) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface)',
        border: isSelected
          ? '1.5px solid var(--color-blue)'
          : '0.5px solid var(--color-border)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59,130,246,0.12)'
          : hovered ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        position: 'relative',
      }}
    >
      {/* Left: checkbox (compare) or drag handle + dot */}
      {compareMode ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onClick()}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-blue)', marginTop: 2, flexShrink: 0 }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 3 }}>
          <span
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, sprint.id) }}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--color-text-3)',
              cursor: 'grab',
              fontSize: 10,
              opacity: hovered ? 0.7 : 0,
              transition: 'opacity 0.15s',
              lineHeight: 1,
            }}
            title="Arrastar para reordenar"
          >
            ⠿
          </span>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sprint.title}
          </span>
          {sprint.favorite && (
            <span style={{ fontSize: 11, color: 'var(--color-amber-mid)', flexShrink: 0 }}>★</span>
          )}
          {compareMode && isSelected && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--color-blue-text)',
              background: 'var(--color-blue-light)', padding: '1px 6px',
              borderRadius: 10, flexShrink: 0,
            }}>
              selecionada
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--color-text-2)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </div>
        {/* Mini progress bar */}
        <div style={{
          height: 3, borderRadius: 2,
          background: 'var(--color-border)',
          marginTop: 6, maxWidth: 180,
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: dotColor, borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Right actions — visible on hover */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
        opacity: hovered && !compareMode ? 1 : 0,
        transition: 'opacity 0.15s',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, sprint.id) }}
          title={sprint.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-label={sprint.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={sprint.favorite}
          style={{
            width: 26, height: 26, borderRadius: 6,
            border: 'none', background: 'transparent',
            color: sprint.favorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}
        >
          {sprint.favorite ? '★' : '☆'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e) }}
          title="Excluir sprint"
          aria-label="Excluir sprint"
          style={{
            width: 26, height: 26, borderRadius: 6,
            border: 'none', background: 'transparent',
            color: 'var(--color-text-3)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 13,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-red-light)'
            e.currentTarget.style.color = 'var(--color-red)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-3)'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterGroup({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--color-text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-text)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border-md)',
          borderRadius: 6,
          padding: '3px 24px 3px 8px',
          cursor: 'pointer',
          fontFamily: 'var(--font-family-sans)',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {children}
      </select>
    </div>
  )
}

function Modal({
  title,
  onClose,
  danger,
  children,
}: {
  title: string
  onClose: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 14,
          padding: 24,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: danger ? 'var(--color-red)' : 'var(--color-text)',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: 'var(--color-text-2)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
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
