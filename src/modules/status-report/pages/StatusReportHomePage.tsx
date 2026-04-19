import { useEffect, useMemo, useRef, useState } from 'react'
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
type FilterStatus = 'all' | 'active' | 'concluded' | 'favorites'

// ─── Icons (SVG inline, Lucide paths) ────────────────────────────────────────

function Svg({ size = 14, children, filled }: { size?: number; children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}
function IconFileText({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Svg>
}
function IconUsers({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
}
function IconCalendar({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>
}
function IconStar({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return <Svg size={size} filled={filled}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>
}
function IconMoreHoriz({ size = 14 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Svg>
}
function IconPlus({ size = 14 }: { size?: number }) { return <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg> }
function IconCheck({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Svg>
}
function IconRotateCcw({ size = 14 }: { size?: number }) {
  return <Svg size={size}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></Svg>
}
function IconCopy({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>
}
function IconMove({ size = 14 }: { size?: number }) {
  return <Svg size={size}><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></Svg>
}
function IconTrash2({ size = 14 }: { size?: number }) {
  return <Svg size={size}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Svg>
}
function IconSearch({ size = 15 }: { size?: number }) {
  return <Svg size={size}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
}
function IconFunnel({ size = 14 }: { size?: number }) {
  return <Svg size={size}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Svg>
}
function IconChevronDownSm({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.6, marginLeft: 2 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function IconX({ size = 12 }: { size?: number }) {
  return <Svg size={size}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
}

// ─── Dropdown hook ────────────────────────────────────────────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const menuStyle: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
  minWidth: 220, padding: 6,
  zIndex: 500,
}
const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px', width: '100%',
  fontSize: 13, fontWeight: 500,
  color: 'var(--color-text)',
  background: 'transparent', border: 'none', borderRadius: 6,
  cursor: 'pointer', textAlign: 'left',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s',
}
const menuItemDangerStyle: React.CSSProperties = { ...menuItemStyle, color: 'var(--color-red)' }
const menuSepStyle: React.CSSProperties = { height: 1, background: 'var(--color-border)', margin: '4px 2px' }

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-blue)',
  background: 'var(--color-blue)', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s',
}
const btnOutline: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border-md)',
  background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s, border-color 0.12s',
}

const HOME_TABS: { id: HomeTabId; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'reports',    label: 'Reports',             Icon: IconFileText },
  { id: 'combinados', label: 'Combinados do time',  Icon: IconUsers },
  { id: 'time',       label: 'Time & Calendário',   Icon: IconCalendar },
]

// ─── Component ────────────────────────────────────────────────────────────────

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

  const filterDrop = useDropdown()
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setReports(getMasterIndex())
    return () => resetSquadConfig()
  }, []) // eslint-disable-line

  useEffect(() => {
    const squadId = activeSquadId && activeSquadId !== 'all' ? activeSquadId : 'default'
    initSquadConfig(squadId)
  }, [activeSquadId]) // eslint-disable-line

  // Focus search on '/'
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function refreshList() { setReports(getMasterIndex()) }

  const filtered = useMemo(() => {
    let list = activeSquadId && activeSquadId !== 'all'
      ? reports.filter((r) => r.squadId === activeSquadId)
      : [...reports]
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((r) =>
        (r.title || '').toLowerCase().includes(q) || (r.squad || '').toLowerCase().includes(q),
      )
    }
    if (filterStatus === 'active') list = list.filter((r) => r.status !== 'concluded')
    if (filterStatus === 'concluded') list = list.filter((r) => r.status === 'concluded')
    if (filterStatus === 'favorites') list = list.filter((r) => r.favorite)
    if (filterDateFrom) list = list.filter((r) => (r.periodStart || r.updatedAt.split('T')[0]) >= filterDateFrom)
    if (filterDateTo) list = list.filter((r) => (r.periodEnd || r.periodStart || r.updatedAt.split('T')[0]) <= filterDateTo)
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
    if (idx >= 0) index[idx] = { ...index[idx], ...newEntry }
    else index.unshift(newEntry)
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
      if (import.meta.env.DEV) console.warn('[StatusReport] Falha ao deletar do servidor:', err)
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
      return { ...item, id: newId, createdAt: now, updatedAt: now }
    })
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

  function clearAllFilters() {
    setFilterStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearch('')
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
  const hasFilters = filterStatus !== 'all' || filterDateFrom !== '' || filterDateTo !== '' || search !== ''
  const activeFiltersCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0)

  const STATUS_LABELS: Record<FilterStatus, string> = {
    all: 'Todos',
    active: 'Ativos',
    concluded: 'Concluídos',
    favorites: 'Favoritos',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .sr-home-card:hover { border-color: var(--color-border-md) !important; box-shadow: 0 1px 4px rgba(17,24,39,.05) !important; }
        .sr-home-card:hover .sr-home-actions { opacity: 1 !important; }
        .sr-home-fav-hover:not([data-active="true"]):hover { background: var(--color-amber-light); color: var(--color-amber-mid); border-color: var(--color-amber-mid); }
        .sr-home-kebab:hover { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
        .sr-home-menu-item:hover { background: var(--color-bg); }
        .sr-home-menu-item-danger:hover { background: var(--color-red-light); }
        .sr-home-btn-primary:hover { background: var(--color-blue-text); }
        .sr-home-btn-outline:hover { background: var(--color-bg); }
        .sr-home-clear-btn:hover { background: var(--color-bg); color: var(--color-text); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
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
            style={btnPrimary}
            className="sr-home-btn-primary"
            aria-label="Criar novo status report"
          >
            <IconPlus /> Novo Report
          </button>
        )}
      </div>

      {/* Home tabs */}
      <div
        role="tablist"
        aria-label="Abas de Status Reports"
        style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--color-border)',
          margin: '16px 0 20px',
        }}
      >
        {HOME_TABS.map((tab) => {
          const Icon = tab.Icon
          const active = homeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setHomeTab(tab.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 14px', background: 'none', border: 'none',
                borderBottom: active ? '2px solid var(--color-blue)' : '2px solid transparent',
                color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                fontWeight: active ? 600 : 500,
                fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-family-sans)', marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          )
        })}
      </div>

      {homeTab === 'combinados' && <CombinadosTab />}
      {homeTab === 'time' && <TimeTab />}

      {homeTab === 'reports' && (<>

        {/* Filter bar */}
        {reports.length > 0 && (
          <div style={{ marginBottom: hasFilters ? 10 : 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 420 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', display: 'inline-flex' }}>
                  <IconSearch />
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  aria-label="Buscar report"
                  placeholder="Buscar report..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%', height: 38, padding: '0 38px 0 38px',
                    fontSize: 13, borderRadius: 8,
                    border: '1px solid var(--color-border-md)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    outline: 'none',
                    fontFamily: 'var(--font-family-sans)',
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderBottomWidth: 2, borderRadius: 4, padding: '1px 5px',
                  }}
                >
                  /
                </span>
              </div>

              {/* Filtros dropdown */}
              <div ref={filterDrop.ref} style={{ position: 'relative' }}>
                <button
                  onClick={() => filterDrop.setOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={filterDrop.open}
                  aria-label="Filtros"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 38, padding: '0 14px',
                    background: activeFiltersCount > 0 ? 'var(--color-blue-light)' : 'var(--color-surface)',
                    color: activeFiltersCount > 0 ? 'var(--color-blue-text)' : 'var(--color-text)',
                    border: `1px solid ${activeFiltersCount > 0 ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                    borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  <IconFunnel />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 18, height: 16, padding: '0 5px',
                        fontSize: 10, fontWeight: 700,
                        background: 'var(--color-blue)', color: '#fff',
                        borderRadius: 8, fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {activeFiltersCount}
                    </span>
                  )}
                  <IconChevronDownSm />
                </button>
                {filterDrop.open && (
                  <div
                    role="menu"
                    aria-label="Opções de filtro"
                    style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      boxShadow: '0 12px 32px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
                      minWidth: 280, padding: 14,
                      zIndex: 500,
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <label style={filterLabelStyle}>Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                        style={filterSelectStyle}
                      >
                        <option value="all">Todos</option>
                        <option value="active">Ativos</option>
                        <option value="concluded">Concluídos</option>
                        <option value="favorites">Favoritos</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <label style={filterLabelStyle}>Período</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="date"
                          aria-label="Data inicial"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          style={filterDateStyle}
                        />
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>até</span>
                        <input
                          type="date"
                          aria-label="Data final"
                          value={filterDateTo}
                          min={filterDateFrom || undefined}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          style={filterDateStyle}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Counter */}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-2)', fontWeight: 500 }}>
                {hasFilters ? (
                  <>
                    Mostrando{' '}
                    <b style={{ color: 'var(--color-text)', fontWeight: 700 }}>{filtered.length}</b>
                    {' '}de {squadFiltered.length} report{squadFiltered.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <b style={{ color: 'var(--color-text)', fontWeight: 700 }}>{squadFiltered.length}</b>
                    {' '}report{squadFiltered.length !== 1 ? 's' : ''}
                  </>
                )}
              </span>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                {search && (
                  <FilterChip label={`Busca: "${search}"`} ariaLabel="Remover filtro de busca" onRemove={() => setSearch('')} />
                )}
                {filterStatus !== 'all' && (
                  <FilterChip label={`Status: ${STATUS_LABELS[filterStatus]}`} ariaLabel="Remover filtro Status" onRemove={() => setFilterStatus('all')} />
                )}
                {filterDateFrom && (
                  <FilterChip label={`Desde: ${filterDateFrom}`} ariaLabel="Remover filtro Desde" onRemove={() => setFilterDateFrom('')} />
                )}
                {filterDateTo && (
                  <FilterChip label={`Até: ${filterDateTo}`} ariaLabel="Remover filtro Até" onRemove={() => setFilterDateTo('')} />
                )}
                <button
                  onClick={clearAllFilters}
                  className="sr-home-clear-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    height: 26, padding: '0 10px',
                    background: 'transparent', color: 'var(--color-text-2)',
                    border: 'none', borderRadius: 6,
                    fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  Limpar tudo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state — zero reports */}
        {reports.length === 0 && (
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
              <IconFileText size={26} />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              Crie seu primeiro status report
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Consolide o andamento do seu time em um relatório compartilhável.
            </p>
            <button onClick={() => setShowNew(true)} style={btnPrimary} className="sr-home-btn-primary">
              <IconPlus /> Novo Report
            </button>
          </div>
        )}

        {/* Filtered empty */}
        {reports.length > 0 && filtered.length === 0 && (
          <div
            role="status"
            aria-live="polite"
            style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-2)', fontSize: 13 }}
          >
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', margin: '0 0 6px' }}>
              Nenhum report encontrado
            </p>
            <p style={{ margin: '0 0 14px' }}>Nenhum report corresponde aos filtros atuais.</p>
            {hasFilters && (
              <button onClick={clearAllFilters} style={btnOutline} className="sr-home-btn-outline">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={() => navigate(`/status-report/${report.id}`)}
              onToggleFavorite={() => handleToggleFavorite(report.id)}
              onConclude={() => handleConclude(report.id)}
              onReactivate={() => handleReactivate(report.id)}
              onDuplicate={() => handleDuplicate(report.id)}
              onMigrate={() => { setMigrateFromId(report.id); setMigrateToId(''); setMigrateMode('copy') }}
              onDelete={() => setDeleteId(report.id)}
              formatDate={formatDate}
              formatPeriodShort={formatPeriodShort}
            />
          ))}
        </div>
      </>)}

      {/* New report modal */}
      {showNew && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowNew(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Novo Status Report"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderTop: '3px solid var(--color-blue)',
              borderRadius: 12, padding: 24,
              width: '100%', maxWidth: 420,
              boxShadow: '0 20px 40px rgba(17,24,39,.12)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 16 }}>
              Novo Status Report
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="sr-new-title" style={fieldLabelStyle}>Título *</label>
              <input
                id="sr-new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: APP EP FGTS"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--color-border-md)', fontSize: 13,
                  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                  background: 'var(--color-bg)',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="sr-new-squad" style={fieldLabelStyle}>Squad</label>
              <select
                id="sr-new-squad"
                value={newSquadId}
                onChange={(e) => setNewSquadId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 28px 8px 10px', borderRadius: 8,
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
              <button onClick={() => setShowNew(false)} style={btnOutline} className="sr-home-btn-outline">Cancelar</button>
              <button onClick={handleCreate} style={btnPrimary} className="sr-home-btn-primary" aria-label="Criar report">
                <IconPlus /> Criar Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migrate modal */}
      {migrateFromId && migrateSource && (
        <div
          onClick={(e) => e.target === e.currentTarget && setMigrateFromId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Migrar itens"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderTop: '3px solid var(--color-amber-mid)',
              borderRadius: 12, padding: 24,
              width: '100%', maxWidth: 460,
              boxShadow: '0 20px 40px rgba(17,24,39,.12)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 4 }}>
              Migrar itens
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 16 }}>
              De: <strong>{migrateSource.title}</strong> ({migrateSource.itemCount} itens)
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabelStyle} id="migrate-mode-label">Modo</label>
              <div role="radiogroup" aria-labelledby="migrate-mode-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {(['copy', 'move'] as const).map((m) => {
                  const selected = migrateMode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setMigrateMode(m)}
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
                        {m === 'copy' ? <IconCopy size={13} /> : <IconMove size={13} />}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                        {m === 'copy' ? 'Copiar' : 'Mover'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-3)', lineHeight: 1.35 }}>
                        {m === 'copy' ? 'Original mantém os itens' : 'Original fica vazio'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="migrate-target" style={fieldLabelStyle}>Report destino</label>
              <select
                id="migrate-target"
                value={migrateToId}
                onChange={(e) => setMigrateToId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 28px 8px 10px', borderRadius: 8,
                  border: '1px solid var(--color-border-md)', fontSize: 13,
                  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                  cursor: 'pointer', appearance: 'none',
                  background: 'var(--color-surface)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                <option value="">Selecione o report destino...</option>
                {reports.filter((r) => r.id !== migrateFromId).map((r) => (
                  <option key={r.id} value={r.id}>{r.title} ({r.itemCount} itens)</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setMigrateFromId(null)} style={btnOutline} className="sr-home-btn-outline">Cancelar</button>
              <button
                onClick={handleMigrate}
                disabled={!migrateToId}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: migrateToId ? 'var(--color-amber-mid)' : 'var(--color-border)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: migrateToId ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                {migrateMode === 'copy' ? <IconCopy /> : <IconMove />}
                {migrateMode === 'copy' ? 'Copiar' : 'Mover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && deleteTarget && (
        <ConfirmModal
          title="Excluir Status Report"
          description={`Tem certeza que deseja excluir "${deleteTarget.title}"? Todos os itens serão removidos permanentemente.`}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

// ─── ReportCard ──────────────────────────────────────────────────────────────

function ReportCard({
  report, onOpen, onToggleFavorite, onConclude, onReactivate, onDuplicate, onMigrate, onDelete, formatDate, formatPeriodShort,
}: {
  report: StatusReportIndexEntry
  onOpen: () => void
  onToggleFavorite: () => void
  onConclude: () => void
  onReactivate: () => void
  onDuplicate: () => void
  onMigrate: () => void
  onDelete: () => void
  formatDate: (iso: string) => string
  formatPeriodShort: (start?: string, end?: string) => string
}) {
  const isConcluded = report.status === 'concluded'
  const kebab = useDropdown()

  function menuAction(fn: () => void) {
    kebab.setOpen(false)
    fn()
  }

  const statusDotColor = isConcluded
    ? 'var(--color-green)'
    : report.favorite
    ? 'var(--color-amber-mid)'
    : 'var(--color-blue)'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Abrir report ${report.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-stop-card-key]')) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
      }}
      className="sr-home-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        cursor: 'pointer',
        opacity: isConcluded ? 0.75 : 1,
        transition: 'border-color 0.12s, box-shadow 0.12s',
      }}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        style={{
          width: 8, height: 8, borderRadius: 999,
          background: statusDotColor,
          flexShrink: 0,
        }}
      />

      {/* Favorite (visível) */}
      <button
        data-stop-card-key
        onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
        aria-label={report.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        aria-pressed={report.favorite}
        title={report.favorite ? 'Favorito' : 'Favoritar'}
        className="sr-home-fav-hover"
        data-active={report.favorite ? 'true' : undefined}
        style={{
          width: 30, height: 30, borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: report.favorite ? 'var(--color-amber-light)' : 'transparent',
          color: report.favorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
          border: '1px solid transparent',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.12s, color 0.12s, border-color 0.12s',
        }}
      >
        <IconStar filled={report.favorite === true} />
      </button>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {report.title || 'S/ Título'}
          </span>
          {isConcluded && (
            <span
              aria-label="Status: concluído"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                borderRadius: 999,
                background: 'var(--color-green-light)',
                color: 'var(--color-green)',
                flexShrink: 0,
              }}
            >
              <IconCheck size={10} /> Concluído
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

      {/* Kebab */}
      <div
        ref={kebab.ref}
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', flexShrink: 0 }}
      >
        <button
          data-stop-card-key
          onClick={() => kebab.setOpen((v) => !v)}
          aria-label={`Mais ações para ${report.title}`}
          aria-haspopup="menu"
          aria-expanded={kebab.open}
          title="Mais ações"
          className="sr-home-kebab"
          style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            color: 'var(--color-text-2)',
            border: '1px solid transparent',
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          <IconMoreHoriz />
        </button>
        {kebab.open && (
          <div role="menu" style={menuStyle}>
            {isConcluded ? (
              <button
                role="menuitem"
                className="sr-home-menu-item"
                style={menuItemStyle}
                onClick={() => menuAction(onReactivate)}
              >
                <IconRotateCcw /> Reativar
              </button>
            ) : (
              <button
                role="menuitem"
                className="sr-home-menu-item"
                style={menuItemStyle}
                onClick={() => menuAction(onConclude)}
              >
                <IconCheck /> Concluir
              </button>
            )}
            <button
              role="menuitem"
              className="sr-home-menu-item"
              style={menuItemStyle}
              onClick={() => menuAction(onDuplicate)}
            >
              <IconCopy /> Duplicar
            </button>
            <button
              role="menuitem"
              className="sr-home-menu-item"
              style={menuItemStyle}
              onClick={() => menuAction(onMigrate)}
            >
              <IconMove /> Migrar itens
            </button>
            <div style={menuSepStyle} />
            <button
              role="menuitem"
              className="sr-home-menu-item-danger"
              style={menuItemDangerStyle}
              onClick={() => menuAction(onDelete)}
            >
              <IconTrash2 /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FilterChip ──────────────────────────────────────────────────────────────

function FilterChip({ label, ariaLabel, onRemove }: { label: string; ariaLabel: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 6px 4px 10px',
        border: '1px solid var(--color-blue)',
        background: 'var(--color-blue-light)',
        color: 'var(--color-blue-text)',
        fontSize: 12, fontWeight: 600,
        borderRadius: 999,
        fontFamily: 'var(--font-family-sans)',
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={ariaLabel}
        style={{
          background: 'transparent', border: 'none',
          color: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 2, borderRadius: 999,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <IconX />
      </button>
    </span>
  )
}

// ─── Small styles ────────────────────────────────────────────────────────────

const fieldLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 6,
}
const filterLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 4,
}
const filterSelectStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px',
  border: '1px solid var(--color-border-md)', borderRadius: 6,
  background: 'var(--color-surface)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
}
const filterDateStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px', borderRadius: 6, fontSize: 12,
  border: '1px solid var(--color-border-md)',
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)',
}
