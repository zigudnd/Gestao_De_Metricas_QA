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
  const [formErrors, setFormErrors] = useState<string[]>([])

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
        setFormErrors([])
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
    setFormErrors([])
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
    setFormErrors([])
    setShowModal(true)
  }

  function validateForm(): string[] {
    const errors: string[] = []
    if (!formName.trim()) errors.push('Nome é obrigatório')
    if (!formVersion.trim()) errors.push('Versão é obrigatória')
    if (!formCutoff) errors.push('Data de corte é obrigatória')
    if (!formHomoStart) errors.push('Início da homologação é obrigatório')
    if (!formHomoEnd) errors.push('Fim da homologação é obrigatório')
    if (!formProdDate) errors.push('Data de produção é obrigatória')

    // Chronological order
    if (formCutoff && formHomoStart && formCutoff > formHomoStart) {
      errors.push('Data de corte deve ser anterior ao início da homologação')
    }
    if (formHomoStart && formHomoEnd && formHomoStart > formHomoEnd) {
      errors.push('Início deve ser anterior ao fim da homologação')
    }
    if (formHomoEnd && formProdDate && formHomoEnd > formProdDate) {
      errors.push('Fim da homologação deve ser anterior à data de produção')
    }
    return errors
  }

  function handleSave() {
    const errors = validateForm()
    if (errors.length > 0) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {syncStatus === 'saving' && (
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Salvando...</span>
          )}
          {syncStatus === 'saved' && (
            <span style={{ fontSize: 12, color: 'var(--color-green)' }}>Salvo</span>
          )}
          {syncStatus === 'error' && (
            <span style={{ fontSize: 12, color: 'var(--color-red)' }}>Erro ao salvar</span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {syncError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300 mb-4">
          <span>{syncError}</span>
          <button
            onClick={handleRetrySync}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
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
        {([
          { id: 'checkpoint' as HomeTab, label: 'Checkpoint' },
          { id: 'regressivos' as HomeTab, label: 'Regressivos' },
          { id: 'historico' as HomeTab, label: 'Histórico' },
          { id: 'cronograma' as HomeTab, label: 'Cronograma' },
          { id: 'eventos' as HomeTab, label: 'Eventos' },
          { id: 'prs' as HomeTab, label: 'PRs' },
        ]).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={homeTab === tab.id}
            onClick={() => setHomeTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', background: 'none', border: 'none',
              borderBottom: homeTab === tab.id ? '2px solid var(--color-blue)' : '2px solid transparent',
              color: homeTab === tab.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
              fontWeight: homeTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family-sans)', marginBottom: -1,
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
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

            {/* Errors */}
            {formErrors.length > 0 && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: 'var(--color-red-light)', border: '1px solid var(--color-red-mid)',
                fontSize: 12, color: 'var(--color-red)',
              }}>
                {formErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Nome *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Release Sprint 42"
                autoFocus
                disabled={!!editId}
                style={{
                  ...inputStyle,
                  opacity: editId ? 0.6 : 1,
                  cursor: editId ? 'not-allowed' : undefined,
                }}
              />
            </div>

            {/* Version */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Versão *</label>
              <input
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="Ex: v4.2.0"
                disabled={!!editId}
                style={{
                  ...inputStyle,
                  opacity: editId ? 0.6 : 1,
                  cursor: editId ? 'not-allowed' : undefined,
                }}
              />
            </div>

            {/* Dates in grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Data Corte *</label>
                <input
                  type="date" value={formCutoff}
                  onChange={(e) => setFormCutoff(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Início Homologação *</label>
                <input
                  type="date" value={formHomoStart}
                  onChange={(e) => setFormHomoStart(e.target.value)}
                  min={formCutoff || undefined}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fim Homologação *</label>
                <input
                  type="date" value={formHomoEnd}
                  onChange={(e) => setFormHomoEnd(e.target.value)}
                  min={formHomoStart || undefined}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Data Produção *</label>
                <input
                  type="date" value={formProdDate}
                  onChange={(e) => setFormProdDate(e.target.value)}
                  min={formHomoEnd || undefined}
                  style={inputStyle}
                />
              </div>
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
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: 'var(--color-blue)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                {editId ? 'Salvar' : 'Criar'}
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
