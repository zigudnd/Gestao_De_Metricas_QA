import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMasterIndex, saveMasterIndex, upsertMasterIndex,
  createDefaultState, saveToLocalStorage, loadFromLocalStorage,
  deleteFromLocalStorage, removeFromMasterIndex, deleteFromServer,
  persistToServer, normalizeState,
  toggleFavorite, concludeReport, reactivateReport,
} from '../services/statusReportPersistence'
import type { StatusReportIndexEntry, StatusReportItem } from '../types/statusReport.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { CombinadosTab } from '../components/combinados/CombinadosTab'
import { TimeTab } from '../components/time/TimeTab'
import { useSquadConfigStore } from '../store/squadConfigStore'
import { uid } from '@/lib/uid'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'

type HomeTabId = 'reports' | 'combinados' | 'time'

const HOME_TABS: { id: HomeTabId; label: string; icon: string }[] = [
  { id: 'reports',    label: 'Reports',             icon: '📄' },
  { id: 'combinados', label: 'Combinados do time',  icon: '🤝' },
  { id: 'time',       label: 'Time & Calendário',   icon: '👥' },
]

type FilterStatus = 'all' | 'active' | 'concluded' | 'favorites'

const btnIcon: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 6, border: 'none',
  background: 'transparent', cursor: 'pointer',
  color: 'var(--color-text-3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s',
  flexShrink: 0,
}

export function StatusReportHomePage() {
  const navigate = useNavigate()
  const [homeTab, setHomeTab] = useState<HomeTabId>('reports')
  const { initSquadConfig, resetSquadConfig } = useSquadConfigStore()
  const activeSquadId = useActiveSquadStore((s) => s.activeSquadId)
  const squads = useActiveSquadStore((s) => s.squads)
  const [reports, setReports] = useState<StatusReportIndexEntry[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSquadId, setNewSquadId] = useState(activeSquadId && activeSquadId !== 'all' ? activeSquadId : '')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [migrateFromId, setMigrateFromId] = useState<string | null>(null)
  const [migrateToId, setMigrateToId] = useState<string>('')
  const [migrateMode, setMigrateMode] = useState<'copy' | 'move'>('copy')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    setReports(getMasterIndex())
    return () => resetSquadConfig()
  }, []) // eslint-disable-line

  // Inicializar squad config quando o squad ativo muda
  useEffect(() => {
    const squadId = activeSquadId && activeSquadId !== 'all' ? activeSquadId : 'default'
    initSquadConfig(squadId)
  }, [activeSquadId]) // eslint-disable-line

  function refreshList() {
    setReports(getMasterIndex())
  }

  // ── Filtered + sorted list ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = activeSquadId && activeSquadId !== 'all'
      ? reports.filter((r) => r.squadId === activeSquadId)
      : [...reports]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((r) =>
        (r.title || '').toLowerCase().includes(q) || (r.squad || '').toLowerCase().includes(q),
      )
    }

    // Status filter
    if (filterStatus === 'active') list = list.filter((r) => r.status !== 'concluded')
    if (filterStatus === 'concluded') list = list.filter((r) => r.status === 'concluded')
    if (filterStatus === 'favorites') list = list.filter((r) => r.favorite)

    // Date filter
    if (filterDateFrom) {
      list = list.filter((r) => (r.periodStart || r.updatedAt.split('T')[0]) >= filterDateFrom)
    }
    if (filterDateTo) {
      list = list.filter((r) => (r.periodEnd || r.periodStart || r.updatedAt.split('T')[0]) <= filterDateTo)
    }

    // Sort: favorites first, then by updatedAt desc
    list.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return (b.updatedAt || '').localeCompare(a.updatedAt || '')
    })

    return list
  }, [reports, search, filterStatus, filterDateFrom, filterDateTo, activeSquadId])

  // ── Actions ─────────────────────────────────────────────────────────────────

  function handleCreate() {
    const title = newTitle.trim() || 'Novo Status Report'
    const selectedSquad = squads.find((s) => s.id === newSquadId)
    const id = 'sr_' + uid()
    const state = createDefaultState(id)
    state.config.title = title
    state.config.squad = selectedSquad?.name ?? ''
    state.config.date = new Date().toISOString().split('T')[0]
    saveToLocalStorage(state)
    persistToServer(state).catch(() => {
      showToast('Report criado localmente, mas falhou ao sincronizar com o servidor', 'error')
    })
    // Build index entry in a single pass (upsert + squadId together)
    const index = getMasterIndex()
    const now = new Date().toISOString()
    const newEntry = {
      id: state.id,
      title: state.config.title || 'S/ Titulo',
      squad: state.config.squad || '',
      itemCount: state.items.length,
      updatedAt: state.updatedAt || now,
      periodStart: state.config.periodStart || '',
      periodEnd: state.config.periodEnd || '',
      favorite: false,
      status: 'active' as const,
      squadId: newSquadId || undefined,
    }
    const idx = index.findIndex((e) => e.id === id)
    if (idx >= 0) {
      index[idx] = { ...index[idx], ...newEntry }
    } else {
      index.unshift(newEntry)
    }
    saveMasterIndex(index)
    setShowNew(false)
    setNewTitle('')
    setNewSquadId(activeSquadId && activeSquadId !== 'all' ? activeSquadId : '')
    navigate(`/status-report/${id}`)
  }

  function handleDelete(id: string) {
    deleteFromLocalStorage(id)
    removeFromMasterIndex(id)
    deleteFromServer(id).catch((err) => {
      console.warn('[StatusReport] Falha ao deletar do servidor:', err)
      showToast('Erro ao sincronizar exclusão com o servidor', 'error')
    })
    refreshList()
    setDeleteId(null)
  }

  function handleDuplicate(sourceId: string) {
    const source = loadFromLocalStorage(sourceId)
    if (!source) return
    const newId = 'sr_' + uid()
    const now = new Date().toISOString()
    const cloned = normalizeState({
      ...structuredClone(source),
      id: newId,
      config: { ...source.config, title: source.config.title + ' (cópia)' },
      createdAt: now,
      updatedAt: now,
      items: source.items.map((item: StatusReportItem) => {
        const newItemId = 'sr_' + uid()
        return { ...item, id: newItemId, _oldId: item.id, createdAt: now, updatedAt: now }
      }),
    })
    const idMap = new Map<string, string>()
    source.items.forEach((old: StatusReportItem, i: number) => {
      idMap.set(old.id, cloned.items[i].id)
    })
    cloned.items = cloned.items.map((item: StatusReportItem & { _oldId?: string }) => {
      const { _oldId, ...rest } = item
      return { ...rest, dependsOn: rest.dependsOn.map((depId: string) => idMap.get(depId) ?? depId) }
    })
    saveToLocalStorage(cloned)
    upsertMasterIndex(cloned)
    persistToServer(cloned).catch(() => {
      showToast('Report criado localmente, mas falhou ao sincronizar com o servidor', 'error')
    })
    refreshList()
    showToast('Report duplicado', 'success')
  }

  function handleToggleFavorite(id: string) {
    toggleFavorite(id)
    refreshList()
  }

  async function handleConclude(id: string) {
    try {
      await concludeReport(id)
      refreshList()
      showToast('Report concluído', 'success')
    } catch {
      refreshList()
      showToast('Erro ao concluir report no servidor', 'error')
    }
  }

  async function handleReactivate(id: string) {
    try {
      await reactivateReport(id)
      refreshList()
      showToast('Report reativado', 'info')
    } catch {
      refreshList()
      showToast('Erro ao reativar report no servidor', 'error')
    }
  }

  function handleMigrate() {
    if (!migrateFromId || !migrateToId || migrateFromId === migrateToId) return
    const source = loadFromLocalStorage(migrateFromId)
    const target = loadFromLocalStorage(migrateToId)
    if (!source || !target) return
    const now = new Date().toISOString()
    const idMap = new Map<string, string>()
    const copiedItems: StatusReportItem[] = source.items.map((item) => {
      const newId = 'sr_' + uid()
      idMap.set(item.id, newId)
      return {
        ...item,
        id: newId,
        createdAt: now,
        updatedAt: now,
      }
    })
    // Remap dependsOn using idMap (only remap deps that are in the migrated set)
    copiedItems.forEach((item) => {
      item.dependsOn = item.dependsOn
        .map((depId) => idMap.get(depId) ?? depId)
        .filter((depId) => idMap.has(depId) || target.items.some((t) => t.id === depId))
    })
    target.items = [...target.items, ...copiedItems]
    target.updatedAt = now
    for (const sec of source.sections) {
      if (!target.sections.find((s) => s.id === sec.id)) target.sections.push({ ...sec })
    }
    saveToLocalStorage(target)
    upsertMasterIndex(target)
    persistToServer(target).catch(() => {
      showToast('Report criado localmente, mas falhou ao sincronizar com o servidor', 'error')
    })
    if (migrateMode === 'move') {
      source.items = []
      source.updatedAt = now
      saveToLocalStorage(source)
      upsertMasterIndex(source)
      persistToServer(source).catch(() => {
        showToast('Report criado localmente, mas falhou ao sincronizar com o servidor', 'error')
      })
    }
    refreshList()
    setMigrateFromId(null)
    setMigrateToId('')
    showToast(migrateMode === 'copy' ? 'Itens copiados' : 'Itens movidos', 'success')
  }

  function formatDate(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function formatPeriodShort(start?: string, end?: string): string {
    if (!start && !end) return ''
    const fmt = (s: string) => { const [, m, d] = s.split('-'); return `${d}/${m}` }
    if (start && end) return `${fmt(start)} – ${fmt(end)}`
    if (start) return `${fmt(start)} –`
    return `– ${fmt(end!)}`
  }

  const deleteTarget = reports.find((r) => r.id === deleteId)
  const migrateSource = reports.find((r) => r.id === migrateFromId)
  const squadFiltered = activeSquadId && activeSquadId !== 'all'
    ? reports.filter((r) => r.squadId === activeSquadId)
    : reports
  const activeCount = squadFiltered.filter((r) => r.status !== 'concluded').length
  const concludedCount = squadFiltered.filter((r) => r.status === 'concluded').length
  const favCount = squadFiltered.filter((r) => r.favorite).length

  // ── Filter chips ──────────────────────────────────────────────────────────

  const FILTERS: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: squadFiltered.length },
    { id: 'active', label: 'Ativos', count: activeCount },
    { id: 'concluded', label: 'Concluídos', count: concludedCount },
    { id: 'favorites', label: 'Favoritos', count: favCount },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .sr-home-card-hover:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .sr-home-fav-hover:not([data-active="true"]):hover { background: var(--color-amber-light); border-color: var(--color-amber-mid); color: var(--color-amber-mid); }
        .sr-home-btn-blue:hover { background: var(--color-blue-light); border-color: var(--color-blue); color: var(--color-blue-text); }
        .sr-home-btn-green:hover { background: var(--color-green-light); border-color: var(--color-green-mid); color: var(--color-green); }
        .sr-home-btn-amber:hover { background: var(--color-amber-light); border-color: var(--color-amber-mid); color: var(--color-amber); }
        .sr-home-btn-red:hover { background: var(--color-red-light); border-color: var(--color-red-mid); color: var(--color-red); }
      `}</style>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Status Reports
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '4px 0 0' }}>
            Gerencie os relatórios de status dos seus times
          </p>
        </div>
        {homeTab === 'reports' && (
          <button
            onClick={() => setShowNew(true)}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'var(--color-blue)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            + Novo Report
          </button>
        )}
      </div>

      {/* Home tabs */}
      <div role="tablist" aria-label="Abas de Status Reports" style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--color-border)',
        margin: '16px 0 20px',
      }}>
        {HOME_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={homeTab === tab.id}
            onClick={() => setHomeTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: homeTab === tab.id ? '2px solid var(--color-blue)' : '2px solid transparent',
              color: homeTab === tab.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
              fontWeight: homeTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family-sans)', marginBottom: -1,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Combinados */}
      {homeTab === 'combinados' && <CombinadosTab />}

      {/* Tab: Time */}
      {homeTab === 'time' && <TimeTab />}

      {/* Tab: Reports */}
      {homeTab === 'reports' && (<>


      {/* Filters bar */}
      {reports.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
          flexWrap: 'wrap',
        }}>
          {/* Status chips */}
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                border: filterStatus === f.id ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                background: filterStatus === f.id ? 'var(--color-blue-light)' : 'transparent',
                color: filterStatus === f.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                transition: 'all 0.15s',
              }}
            >
              {f.label} <span style={{ opacity: 0.6 }}>({f.count})</span>
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

          {/* Date range filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>De:</span>
            <input
              type="date" value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{
                padding: '4px 6px', borderRadius: 6, fontSize: 11,
                border: '1px solid var(--color-border-md)',
                fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Até:</span>
            <input
              type="date" value={filterDateTo}
              min={filterDateFrom || undefined}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{
                padding: '4px 6px', borderRadius: 6, fontSize: 11,
                border: '1px solid var(--color-border-md)',
                fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
              }}
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
                title="Limpar filtro de data"
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: 'var(--color-text-3)', fontSize: 12, padding: '2px 4px',
                }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: 'relative', width: 200 }}>
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-3)', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
            </span>
            <input
              type="text" placeholder="Buscar..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px 6px 28px', fontSize: 12,
                borderRadius: 7, border: '1px solid var(--color-border-md)',
                background: 'var(--color-bg)', color: 'var(--color-text)',
                outline: 'none', fontFamily: 'var(--font-family-sans)',
              }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {reports.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: 'var(--color-text-3)', fontSize: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          Nenhum status report criado ainda.
          <br />
          Clique em <strong>+ Novo Report</strong> para começar.
        </div>
      )}

      {/* Filtered empty */}
      {reports.length > 0 && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'var(--color-text-3)', fontSize: 13,
        }}>
          Nenhum report encontrado com os filtros atuais.
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((report) => {
          const isConcluded = report.status === 'concluded'
          return (
            <div
              key={report.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: isConcluded ? '3px solid var(--color-green-mid)' : report.favorite ? '3px solid var(--color-amber-mid)' : '1px solid var(--color-border)',
                borderRadius: 10,
                cursor: 'pointer',
                opacity: isConcluded ? 0.7 : 1,
                transition: 'box-shadow 0.15s',
              }}
              onClick={() => navigate(`/status-report/${report.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/status-report/${report.id}`) } }}
              role="button"
              tabIndex={0}
              className="sr-home-card-hover"
            >
              {/* Favorite star */}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(report.id) }}
                aria-label={report.favorite ? 'Remover favorito' : 'Favoritar'}
                aria-pressed={report.favorite}
                style={{
                  height: 36, minWidth: 36, borderRadius: 8,
                  border: '1px solid transparent',
                  background: report.favorite ? 'var(--color-amber-light)' : 'transparent',
                  color: report.favorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontSize: 14, padding: '0 8px',
                  transition: 'all 0.15s', fontFamily: 'var(--font-family-sans)',
                }}
                className="sr-home-fav-hover"
                data-active={report.favorite ? 'true' : undefined}
              >
                {report.favorite ? '★' : '☆'}
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {report.title || 'S/ Título'}
                  </span>
                  {isConcluded && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 4, background: 'var(--color-green-light)',
                      color: 'var(--color-green)',
                    }}>
                      Concluído
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                  {report.squad && <span>{report.squad} · </span>}
                  {report.itemCount} {report.itemCount === 1 ? 'item' : 'itens'}
                  {(report.periodStart || report.periodEnd) && (
                    <span style={{ marginLeft: 6 }}>
                      · {formatPeriodShort(report.periodStart, report.periodEnd)}
                    </span>
                  )}
                  <span style={{ marginLeft: 8, color: 'var(--color-text-3)' }}>
                    {formatDate(report.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Actions — same style as Cobertura QA (36px, icon + label) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {isConcluded ? (
                  <button
                    onClick={() => handleReactivate(report.id)}
                    aria-label="Reativar report"
                    style={{
                      height: 36, minWidth: 36, borderRadius: 8,
                      border: '1px solid transparent', background: 'transparent',
                      color: 'var(--color-text-3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      fontSize: 12, fontWeight: 600, padding: '0 10px',
                      transition: 'all 0.15s', fontFamily: 'var(--font-family-sans)',
                    }}
                    className="sr-home-btn-blue"
                  >
                    <span style={{ fontSize: 14 }}>↩</span>
                    <span style={{ fontSize: 11 }}>Reativar</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleConclude(report.id)}
                    aria-label="Concluir report"
                    style={{
                      height: 36, minWidth: 36, borderRadius: 8,
                      border: '1px solid transparent', background: 'transparent',
                      color: 'var(--color-text-3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      fontSize: 12, fontWeight: 600, padding: '0 10px',
                      transition: 'all 0.15s', fontFamily: 'var(--font-family-sans)',
                    }}
                    className="sr-home-btn-green"
                  >
                    <span style={{ fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 11 }}>Concluir</span>
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(report.id)}
                  aria-label="Duplicar report"
                  style={{
                    height: 36, minWidth: 36, borderRadius: 8,
                    border: '1px solid transparent', background: 'transparent',
                    color: 'var(--color-text-3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, padding: '0 10px',
                    transition: 'all 0.15s', fontFamily: 'var(--font-family-sans)',
                  }}
                  className="sr-home-btn-blue"
                >
                  <span style={{ fontSize: 14 }}>⧉</span>
                  <span style={{ fontSize: 11 }}>Duplicar</span>
                </button>
                <button
                  onClick={() => { setMigrateFromId(report.id); setMigrateToId(''); setMigrateMode('copy') }}
                  aria-label="Migrar itens para outro report"
                  style={{
                    height: 36, minWidth: 36, borderRadius: 8,
                    border: '1px solid transparent', background: 'transparent',
                    color: 'var(--color-text-3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, padding: '0 10px',
                    transition: 'all 0.15s', fontFamily: 'var(--font-family-sans)',
                  }}
                  className="sr-home-btn-amber"
                >
                  <span style={{ fontSize: 14 }}>↗</span>
                  <span style={{ fontSize: 11 }}>Migrar</span>
                </button>
                <button
                  onClick={() => setDeleteId(report.id)}
                  aria-label="Excluir report"
                  style={{
                    height: 36, minWidth: 36, borderRadius: 8,
                    border: '1px solid transparent', background: 'transparent',
                    color: 'var(--color-text-3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, padding: '0 10px',
                    transition: 'all 0.15s', fontFamily: 'var(--font-family-sans)',
                  }}
                  className="sr-home-btn-red"
                >
                  <span style={{ fontSize: 13 }}>✕</span>
                  <span style={{ fontSize: 11 }}>Excluir</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* New report modal */}
      {showNew && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowNew(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Novo Status Report" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-blue)',
            borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 400,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 16 }}>
              Novo Status Report
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4 }}>
                Título *
              </label>
              <input
                value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: APP EP FGTS" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 7,
                  border: '1px solid var(--color-border-md)', fontSize: 13,
                  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4 }}>
                Squad
              </label>
              <select
                value={newSquadId}
                onChange={(e) => setNewSquadId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 28px 8px 10px', borderRadius: 7,
                  border: '1px solid var(--color-border-md)', fontSize: 13,
                  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                  background: 'var(--color-surface)', cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                <option value="">— Sem squad —</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid var(--color-border-md)',
                background: 'transparent', color: 'var(--color-text-2)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}>Cancelar</button>
              <button onClick={handleCreate} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: 'var(--color-blue)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Migrate modal */}
      {migrateFromId && migrateSource && (
        <div
          onClick={(e) => e.target === e.currentTarget && setMigrateFromId(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Migrar itens" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-amber-mid)',
            borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 440,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 4 }}>
              Migrar itens
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 16 }}>
              De: <strong>{migrateSource.title}</strong> ({migrateSource.itemCount} itens)
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6 }}>Modo</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['copy', 'move'] as const).map((m) => (
                  <button key={m} onClick={() => setMigrateMode(m)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    border: migrateMode === m ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                    background: migrateMode === m ? 'var(--color-blue-light)' : 'transparent',
                    color: migrateMode === m ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                  }}>{m === 'copy' ? 'Copiar itens' : 'Mover itens'}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                {migrateMode === 'copy' ? 'Os itens serão copiados — o report original mantém seus itens.' : 'Os itens serão movidos — o report original ficará vazio.'}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4 }}>Report destino</label>
              <select value={migrateToId} onChange={(e) => setMigrateToId(e.target.value)} style={{
                width: '100%', padding: '8px 28px 8px 10px', borderRadius: 7,
                border: '1px solid var(--color-border-md)', fontSize: 13,
                fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                cursor: 'pointer', appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}>
                <option value="">Selecione o report destino...</option>
                {reports.filter((r) => r.id !== migrateFromId).map((r) => (
                  <option key={r.id} value={r.id}>{r.title} ({r.itemCount} itens)</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setMigrateFromId(null)} style={{
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid var(--color-border-md)',
                background: 'transparent', color: 'var(--color-text-2)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}>Cancelar</button>
              <button onClick={handleMigrate} disabled={!migrateToId} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: migrateToId ? 'var(--color-amber-mid)' : '#ccc',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: migrateToId ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-family-sans)',
              }}>{migrateMode === 'copy' ? 'Copiar' : 'Mover'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {/* Delete confirmation */}
      {deleteId && deleteTarget && (
        <ConfirmModal
          title="Excluir Status Report"
          description={`Tem certeza que deseja excluir "${deleteTarget.title}"? Todos os itens serão removidos permanentemente.`}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
      </>)}
    </div>
  )
}
