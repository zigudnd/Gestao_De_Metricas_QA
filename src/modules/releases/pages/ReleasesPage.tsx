import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReleaseStore } from '../store/releaseStore'
import { syncAllReleases } from '../services/releasePersistence'
import type { Release, ReleaseStatus } from '../types/release.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { CheckpointTab } from '../components/dashboard/CheckpointTab'
import { CronogramaTab } from '../components/dashboard/CronogramaTab'
import { EventsTab, DEFAULT_EVENTS, type CalendarEvent } from '../components/dashboard/EventsTab'
import { RegressivosTab } from '../components/dashboard/RegressivosTab'
import { PRsTabHome } from '../components/prs/PRsTabHome'
import { uid } from '@/lib/uid'
import { STATUS_LABELS, STATUS_COLORS } from '../constants/status'
import { fmtDateFull } from '../utils/dateFormat'

type HomeTab = 'checkpoint' | 'regressivos' | 'historico' | 'cronograma' | 'eventos' | 'prs'

const formatDateBR = fmtDateFull

// ─── Icons (SVG inline, Lucide paths) ────────────────────────────────────────

function Svg({ size = 14, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >{children}</svg>
  )
}
function IconPlus({ size = 14 }: { size?: number }) { return <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg> }
function IconTarget({ size = 15 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>
}
function IconRefreshCw({ size = 15 }: { size?: number }) {
  return <Svg size={size}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>
}
function IconArchive({ size = 15 }: { size?: number }) {
  return <Svg size={size}><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></Svg>
}
function IconCalendar({ size = 15 }: { size?: number }) {
  return <Svg size={size}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>
}
function IconCalendarDays({ size = 15 }: { size?: number }) {
  return <Svg size={size}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="8.01" y2="14" /><line x1="12" y1="14" x2="12.01" y2="14" /><line x1="16" y1="14" x2="16.01" y2="14" /></Svg>
}
function IconGitPullRequest({ size = 15 }: { size?: number }) {
  return <Svg size={size}><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></Svg>
}
function IconAlertCircle({ size = 14 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Svg>
}

const HOME_TABS: { id: HomeTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'checkpoint',  label: 'Checkpoint',  Icon: IconTarget },
  { id: 'regressivos', label: 'Regressivos', Icon: IconRefreshCw },
  { id: 'historico',   label: 'Histórico',   Icon: IconArchive },
  { id: 'cronograma',  label: 'Cronograma',  Icon: IconCalendar },
  { id: 'eventos',     label: 'Eventos',     Icon: IconCalendarDays },
  { id: 'prs',         label: 'PRs',         Icon: IconGitPullRequest },
]

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1px solid var(--color-border-md)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--color-text-2)', marginBottom: 4,
}

// ─── Small components ────────────────────────────────────────────────────────

function SyncChip({ tone, label }: { tone: 'ok' | 'warn' | 'danger'; label: string }) {
  const styles: Record<typeof tone, { bg: string; color: string }> = {
    ok: { bg: 'var(--color-green-light)', color: 'var(--color-green)' },
    warn: { bg: 'var(--color-amber-light)', color: 'var(--color-amber-mid)' },
    danger: { bg: 'var(--color-red-light)', color: 'var(--color-red)' },
  }
  const s = styles[tone]
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 999,
        fontSize: 11, fontWeight: 600,
        background: s.bg, color: s.color,
        fontFamily: 'var(--font-family-sans)',
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
      {label}
    </span>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-red)', fontWeight: 500 }}>
      {children}
    </p>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-3)' }}>
      {children}
    </p>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleasesPage() {
  const navigate = useNavigate()
  const {
    releases, load, addRelease, updateRelease, deleteRelease,
    calendarSlots, loadCalendarSlots, addCalendarSlot, removeCalendarSlot, updateCalendarSlot, linkSlotToRelease,
    syncStatus,
  } = useReleaseStore()

  const [homeTab, setHomeTab] = useState<HomeTab>('checkpoint')
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Events state (localStorage)
  const EVENTS_KEY = 'releaseCalendarEvents'
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (raw) { try { return JSON.parse(raw) } catch (e) { if (import.meta.env.DEV) console.warn('[Releases] Failed to parse calendar events:', e) } }
    return DEFAULT_EVENTS
  })
  function saveEvents(next: CalendarEvent[]) {
    setCalendarEvents(next)
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next))
  }

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [fromSlotId, setFromSlotId] = useState<string | null>(null) // slot de origem ao criar release

  // Form state
  const [formName, setFormName] = useState('')
  const [formVersion, setFormVersion] = useState('')
  const [formCutoff, setFormCutoff] = useState('')
  const [formHomoStart, setFormHomoStart] = useState('')
  const [formHomoEnd, setFormHomoEnd] = useState('')
  const [formProdDate, setFormProdDate] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
    loadCalendarSlots()

    // If localStorage is empty (first visit), wait for Supabase sync then re-load
    const currentReleases = useReleaseStore.getState().releases
    if (currentReleases.length === 0) {
      setSyncError(null)
      syncAllReleases().then(() => {
        load()
        setLoading(false)
      }).catch(() => {
        setSyncError('Falha ao sincronizar releases. Verifique sua conexão e tente novamente.')
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  function handleRetrySync() {
    setLoading(true)
    setSyncError(null)
    syncAllReleases().then(() => {
      load()
      setLoading(false)
    }).catch(() => {
      setSyncError('Falha ao sincronizar releases. Verifique sua conexão e tente novamente.')
      setLoading(false)
    })
  }

  // ── Sorted releases ─────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    return [...releases].sort((a, b) => {
      if (!a.productionDate && !b.productionDate) return 0
      if (!a.productionDate) return 1
      if (!b.productionDate) return -1
      return a.productionDate.localeCompare(b.productionDate)
    })
  }, [releases])

  // ── Modal logic ─────────────────────────────────────────────────────────

  function openCreate(slotId?: string) {
    setEditId(null)
    setFromSlotId(slotId ?? null)
    if (slotId) {
      const slot = calendarSlots.find((s) => s.id === slotId)
      if (slot) {
        setFormName(slot.label)
        setFormVersion(slot.version)
        setFormCutoff(slot.cutoffDate)
        setFormHomoStart(slot.homologacaoStart)
        setFormHomoEnd(slot.homologacaoEnd)
        setFormProdDate(slot.productionDate)
        setFormErrors({})
        setShowModal(true)
        return
      }
    }
    setFormName('')
    setFormVersion('')
    setFormCutoff('')
    setFormHomoStart('')
    setFormHomoEnd('')
    setFormProdDate('')
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(release: Release) {
    if (release.status === 'concluida') {
      showToast('Release concluída não pode ser editada', 'error')
      return
    }
    setEditId(release.id)
    setFormName(release.title)
    setFormVersion(release.version)
    setFormCutoff(release.cutoffDate)
    setFormHomoStart(release.homologacaoStart)
    setFormHomoEnd(release.homologacaoEnd)
    setFormProdDate(release.productionDate)
    setFormErrors({})
    setShowModal(true)
  }

  function validateForm(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!formName.trim()) errors.name = 'Nome é obrigatório'
    if (!formVersion.trim()) errors.version = 'Versão é obrigatória'
    if (!formCutoff) errors.cutoff = 'Obrigatória'
    if (!formHomoStart) errors.homoStart = 'Obrigatório'
    if (!formHomoEnd) errors.homoEnd = 'Obrigatório'
    if (!formProdDate) errors.prodDate = 'Obrigatória'

    // Chronological order
    if (formCutoff && formHomoStart && formCutoff > formHomoStart) {
      errors.homoStart = 'Deve ser após a data de corte'
    }
    if (formHomoStart && formHomoEnd && formHomoStart > formHomoEnd) {
      errors.homoEnd = 'Deve ser após o início'
    }
    if (formHomoEnd && formProdDate && formHomoEnd > formProdDate) {
      errors.prodDate = 'Deve ser após fim da homologação'
    }
    return errors
  }

  function handleSave() {
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (editId) {
      updateRelease(editId, {
        cutoffDate: formCutoff,
        homologacaoStart: formHomoStart,
        homologacaoEnd: formHomoEnd,
        productionDate: formProdDate,
      })
      showToast('Release atualizada', 'success')
      setShowModal(false)
    } else {
      const now = new Date().toISOString()
      const newRelease: Release = {
        id: `release_${uid()}`,
        title: formName.trim(),
        version: formVersion.trim(),
        description: '',
        status: 'planejada',
        cutoffDate: formCutoff,
        buildDate: '',
        homologacaoStart: formHomoStart,
        homologacaoEnd: formHomoEnd,
        betaDate: '',
        productionDate: formProdDate,
        platforms: [],
        squads: [],
        checkpoints: [],
        statusHistory: [],
        nonBlockingFeatures: [],
        rolloutPct: 0,
        createdAt: now,
        updatedAt: now,
      }
      addRelease(newRelease)
      // Vincular slot ao release se veio do calendário
      if (fromSlotId) {
        linkSlotToRelease(fromSlotId, newRelease.id)
      }
      showToast('Release criada', 'success')
      setShowModal(false)
      navigate(`/releases/${newRelease.id}`)
    }
  }

  function handleDelete(id: string) {
    deleteRelease(id)
    setDeleteId(null)
    showToast('Release excluída', 'success')
  }

  const deleteTarget = releases.find((r) => r.id === deleteId)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <span style={{ color: 'var(--color-text-2)', fontSize: 13 }}>Carregando...</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .rel-btn-primary:hover { background: var(--color-blue-text) !important; }
      `}</style>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Releases
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '4px 0 0' }}>
            Acompanhe o ciclo de homologação e produção das suas releases
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {syncStatus === 'saving' && <SyncChip tone="warn" label="Salvando..." />}
          {syncStatus === 'saved' && <SyncChip tone="ok" label="Salvo" />}
          {syncStatus === 'error' && <SyncChip tone="danger" label="Erro ao salvar" />}
          <button
            onClick={() => openCreate()}
            aria-label="Criar nova release"
            className="rel-btn-primary"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--color-blue)',
              background: 'var(--color-blue)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              transition: 'background 0.12s',
            }}
          >
            <IconPlus /> Nova Release
          </button>
        </div>
      </div>

      {/* Error banner */}
      {syncError && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '12px 16px', marginBottom: 14,
            background: 'var(--color-red-light)',
            border: '1px solid var(--color-red-mid)',
            borderRadius: 8,
            color: 'var(--color-red)',
            fontSize: 13,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconAlertCircle /> {syncError}
          </span>
          <button
            onClick={handleRetrySync}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'var(--color-red)', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
              flexShrink: 0,
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Abas de Releases" style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 20,
        overflowX: 'auto',
      }}>
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
                flexShrink: 0, transition: 'color 0.15s',
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Checkpoint — só releases ativas (não concluídas) */}
      {homeTab === 'checkpoint' && (
        <CheckpointTab
          releases={sorted.filter((r) => r.status !== 'concluida')}
          onReleaseClick={(id) => navigate(`/releases/${id}`)}
          onDeleteRelease={(id) => setDeleteId(id)}
          onConcludeRelease={(id) => {
            updateRelease(id, {
              status: 'concluida',
              statusHistory: [
                ...(releases.find((r) => r.id === id)?.statusHistory ?? []),
                { from: releases.find((r) => r.id === id)?.status ?? 'planejada', to: 'concluida', timestamp: new Date().toISOString(), reason: 'Concluída via checkpoint' },
              ],
            })
            showToast('Release concluída e movida para Histórico', 'success')
          }}
        />
      )}

      {/* Tab: Regressivos — visão consolidada de sprints vinculadas */}
      {homeTab === 'regressivos' && (
        <RegressivosTab
          releases={sorted}
          onReleaseClick={(id) => navigate(`/releases/${id}`)}
        />
      )}

      {/* Tab: Historico — só releases concluídas */}
      {homeTab === 'historico' && (
        <CheckpointTab
          releases={sorted.filter((r) => r.status === 'concluida')}
          onReleaseClick={(id) => navigate(`/releases/${id}`)}
          onDeleteRelease={(id) => setDeleteId(id)}
          onConcludeRelease={() => {}}
        />
      )}

      {/* Tab: Cronograma */}
      {homeTab === 'cronograma' && (
        <CronogramaTab
          releases={sorted}
          onReleaseClick={(id) => navigate(`/releases/${id}`)}
          onAddRelease={(data) => {
            const now = new Date().toISOString()
            const newRelease: Release = {
              id: `release_${uid()}`,
              title: data.title,
              version: data.version,
              description: '',
              status: 'planejada',
              cutoffDate: data.cutoffDate,
              buildDate: data.buildDate,
              homologacaoStart: data.homologacaoStart,
              homologacaoEnd: data.homologacaoEnd,
              betaDate: data.betaDate,
              productionDate: data.productionDate,
              platforms: data.platforms || [],
              squads: [],
              checkpoints: [],
              statusHistory: [],
              nonBlockingFeatures: [],
              rolloutPct: 0,
              createdAt: now,
              updatedAt: now,
            }
            addRelease(newRelease)
          }}
          onDeleteRelease={deleteRelease}
          onUpdateRelease={updateRelease}
          onDuplicateRelease={(id) => {
            const source = releases.find((r) => r.id === id)
            if (!source) return
            const now = new Date().toISOString()
            const newRelease: Release = {
              ...structuredClone(source),
              id: `release_${uid()}`,
              title: source.title + ' (cópia)',
              status: 'planejada' as const,
              rolloutPct: 0,
              statusHistory: [],
              checkpoints: [],
              createdAt: now,
              updatedAt: now,
            }
            addRelease(newRelease)
            showToast('Release duplicada', 'success')
          }}
          calendarSlots={calendarSlots}
          onAddCalendarSlot={addCalendarSlot}
          onUpdateCalendarSlot={updateCalendarSlot}
          onRemoveCalendarSlot={removeCalendarSlot}
          onCreateReleaseFromSlot={(slotId) => openCreate(slotId)}
        />
      )}

      {/* Tab: Eventos */}
      {homeTab === 'eventos' && (
        <EventsTab
          events={calendarEvents}
          onAdd={(evt) => saveEvents([...calendarEvents, { ...evt, id: 'evt_' + uid() }])}
          onRemove={(id) => saveEvents(calendarEvents.filter((e) => e.id !== id))}
          onUpdate={(id, updates) => saveEvents(calendarEvents.map((e) => e.id === id ? { ...e, ...updates } : e))}
        />
      )}

      {/* Tab: PRs */}
      {homeTab === 'prs' && (
        <PRsTabHome />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div role="dialog" aria-modal="true" aria-label={editId ? 'Editar Release' : 'Nova Release'} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-blue)',
            borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 480,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 16 }}>
              {editId ? 'Editar Release' : 'Nova Release'}
            </div>

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="rel-form-name" style={labelStyle}>Nome *</label>
              <input
                id="rel-form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Release Sprint 42"
                autoFocus
                disabled={!!editId}
                aria-invalid={!!formErrors.name}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.name ? 'var(--color-red-mid)' : 'var(--color-border-md)',
                  opacity: editId ? 0.6 : 1,
                  cursor: editId ? 'not-allowed' : undefined,
                }}
              />
              {formErrors.name && <FieldError>{formErrors.name}</FieldError>}
              {editId && <FieldHint>Para alterar, crie uma nova release.</FieldHint>}
            </div>

            {/* Version */}
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="rel-form-version" style={labelStyle}>Versão *</label>
              <input
                id="rel-form-version"
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="Ex: v4.2.0"
                disabled={!!editId}
                aria-invalid={!!formErrors.version}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.version ? 'var(--color-red-mid)' : 'var(--color-border-md)',
                  opacity: editId ? 0.6 : 1,
                  cursor: editId ? 'not-allowed' : undefined,
                }}
              />
              {formErrors.version && <FieldError>{formErrors.version}</FieldError>}
              {editId && <FieldHint>Para alterar, crie uma nova release.</FieldHint>}
            </div>

            {/* Data de corte */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="rel-form-cutoff" style={labelStyle}>Data de corte *</label>
              <input
                id="rel-form-cutoff"
                type="date" value={formCutoff}
                onChange={(e) => setFormCutoff(e.target.value)}
                aria-label="Data de corte"
                aria-invalid={!!formErrors.cutoff}
                style={{ ...inputStyle, borderColor: formErrors.cutoff ? 'var(--color-red-mid)' : 'var(--color-border-md)' }}
              />
              {formErrors.cutoff && <FieldError>{formErrors.cutoff}</FieldError>}
            </div>

            {/* Homologação — grupo */}
            <div style={{ marginBottom: 14, padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)' }}>
              <div style={{ ...labelStyle, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--color-text-3)' }}>
                Homologação
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor="rel-form-homo-start" style={{ ...labelStyle, fontSize: 11 }}>Início *</label>
                  <input
                    id="rel-form-homo-start"
                    type="date" value={formHomoStart}
                    onChange={(e) => setFormHomoStart(e.target.value)}
                    min={formCutoff || undefined}
                    aria-label="Data de início da homologação"
                    aria-invalid={!!formErrors.homoStart}
                    style={{ ...inputStyle, borderColor: formErrors.homoStart ? 'var(--color-red-mid)' : 'var(--color-border-md)' }}
                  />
                  {formErrors.homoStart && <FieldError>{formErrors.homoStart}</FieldError>}
                </div>
                <div>
                  <label htmlFor="rel-form-homo-end" style={{ ...labelStyle, fontSize: 11 }}>Fim *</label>
                  <input
                    id="rel-form-homo-end"
                    type="date" value={formHomoEnd}
                    onChange={(e) => setFormHomoEnd(e.target.value)}
                    min={formHomoStart || undefined}
                    aria-label="Data de fim da homologação"
                    aria-invalid={!!formErrors.homoEnd}
                    style={{ ...inputStyle, borderColor: formErrors.homoEnd ? 'var(--color-red-mid)' : 'var(--color-border-md)' }}
                  />
                  {formErrors.homoEnd && <FieldError>{formErrors.homoEnd}</FieldError>}
                </div>
              </div>
            </div>

            {/* Produção */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="rel-form-prod" style={labelStyle}>Data de produção *</label>
              <input
                id="rel-form-prod"
                type="date" value={formProdDate}
                onChange={(e) => setFormProdDate(e.target.value)}
                min={formHomoEnd || undefined}
                aria-label="Data de produção"
                aria-invalid={!!formErrors.prodDate}
                style={{ ...inputStyle, borderColor: formErrors.prodDate ? 'var(--color-red-mid)' : 'var(--color-border-md)' }}
              />
              {formErrors.prodDate && <FieldError>{formErrors.prodDate}</FieldError>}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  border: '1px solid var(--color-border-md)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="rel-btn-primary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-blue)',
                  background: 'var(--color-blue)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  transition: 'background 0.12s',
                }}
              >
                {editId ? <>Salvar alterações</> : <><IconPlus /> Criar Release</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && deleteTarget && (
        <ConfirmModal
          title="Excluir Release"
          description={`Tem certeza que deseja excluir "${deleteTarget.title}" (${deleteTarget.version})? Todos os dados serão removidos permanentemente.`}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
