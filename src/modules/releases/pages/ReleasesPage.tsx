import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReleaseStore } from '../store/releaseStore'
import type { Release, ReleaseStatus } from '../types/release.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { CheckpointTab } from '../components/dashboard/CheckpointTab'
import { CronogramaTab } from '../components/dashboard/CronogramaTab'
import { EventsTab, DEFAULT_EVENTS, type CalendarEvent } from '../components/dashboard/EventsTab'
import { RegressivosTab } from '../components/dashboard/RegressivosTab'

type HomeTab = 'checkpoint' | 'regressivos' | 'historico' | 'cronograma' | 'eventos'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReleaseStatus, string> = {
  planejada: 'Planejada',
  em_desenvolvimento: 'Em Desenvolvimento',
  corte: 'Corte',
  em_homologacao: 'Em Homologação',
  em_regressivo: 'Em Regressivo',
  aprovada: 'Aprovada',
  em_producao: 'Em Produção',
  concluida: 'Concluída',
  uniu_escopo: 'Uniu Escopo',
}

const STATUS_COLORS: Record<ReleaseStatus, string> = {
  planejada: 'var(--color-text-3)',
  em_desenvolvimento: 'var(--color-blue)',
  corte: '#8b5cf6',
  em_homologacao: 'var(--color-amber)',
  em_regressivo: '#f97316',
  aprovada: 'var(--color-green)',
  em_producao: '#06b6d4',
  concluida: 'var(--color-green)',
  uniu_escopo: '#8b5cf6',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '--'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleasesPage() {
  const navigate = useNavigate()
  const {
    releases, load, addRelease, updateRelease, deleteRelease,
    calendarSlots, loadCalendarSlots, addCalendarSlot, removeCalendarSlot, updateCalendarSlot, linkSlotToRelease,
  } = useReleaseStore()

  const [homeTab, setHomeTab] = useState<HomeTab>('checkpoint')
  const [loading, setLoading] = useState(true)

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
    setLoading(false)
  }, []) // eslint-disable-line

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
        id: `release_${Date.now()}`,
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
    <div className="flex items-center justify-center" style={{ height: 120 }}>
      <span className="text-small">Carregando...</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="heading-lg" style={{ fontSize: 20 }}>
            Releases
          </h1>
          <p className="text-body" style={{ marginTop: 4 }}>
            Acompanhe o ciclo de homologação e produção das suas releases
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Abas de Releases" className="flex" style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
        {([
          { id: 'checkpoint' as HomeTab, label: 'Checkpoint' },
          { id: 'regressivos' as HomeTab, label: 'Regressivos' },
          { id: 'historico' as HomeTab, label: 'Histórico' },
          { id: 'cronograma' as HomeTab, label: 'Cronograma' },
          { id: 'eventos' as HomeTab, label: 'Eventos' },
        ]).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={homeTab === tab.id}
            onClick={() => setHomeTab(tab.id)}
            className="flex items-center gap-1.5"
            style={{
              padding: '9px 18px', background: 'none', border: 'none',
              borderBottom: homeTab === tab.id ? '2px solid var(--color-blue)' : '2px solid transparent',
              color: homeTab === tab.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
              fontWeight: homeTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family-sans)', marginBottom: -1,
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
          onDeleteRelease={(id) => { deleteRelease(id); showToast('Release excluída', 'success') }}
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
          onDeleteRelease={(id) => { deleteRelease(id); showToast('Release excluída', 'success') }}
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
              id: `release_${Date.now()}`,
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
              id: `release_${Date.now()}`,
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
          onAdd={(evt) => saveEvents([...calendarEvents, { ...evt, id: 'evt_' + Date.now() }])}
          onRemove={(id) => saveEvents(calendarEvents.filter((e) => e.id !== id))}
          onUpdate={(id, updates) => saveEvents(calendarEvents.map((e) => e.id === id ? { ...e, ...updates } : e))}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          className="modal-backdrop"
        >
          <div className="modal-container modal-md" style={{ borderTop: '3px solid var(--color-blue)' }}>
            <div className="heading-sm" style={{ marginBottom: 16 }}>
              {editId ? 'Editar Release' : 'Nova Release'}
            </div>

            {/* Errors */}
            {formErrors.length > 0 && (
              <div className="msg-error" style={{ marginBottom: 14, fontSize: 12 }}>
                {formErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label className="label-field">Nome *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Release Sprint 42"
                autoFocus
                disabled={!!editId}
                className="input-field"
                style={{
                  opacity: editId ? 0.6 : 1,
                  cursor: editId ? 'not-allowed' : undefined,
                }}
              />
            </div>

            {/* Version */}
            <div style={{ marginBottom: 12 }}>
              <label className="label-field">Versão *</label>
              <input
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="Ex: v4.2.0"
                disabled={!!editId}
                className="input-field"
                style={{
                  opacity: editId ? 0.6 : 1,
                  cursor: editId ? 'not-allowed' : undefined,
                }}
              />
            </div>

            {/* Dates in grid */}
            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
              <div>
                <label className="label-field">Data Corte *</label>
                <input
                  type="date" value={formCutoff}
                  onChange={(e) => setFormCutoff(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Início Homologação *</label>
                <input
                  type="date" value={formHomoStart}
                  onChange={(e) => setFormHomoStart(e.target.value)}
                  min={formCutoff || undefined}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Fim Homologação *</label>
                <input
                  type="date" value={formHomoEnd}
                  onChange={(e) => setFormHomoEnd(e.target.value)}
                  min={formHomoStart || undefined}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Data Produção *</label>
                <input
                  type="date" value={formProdDate}
                  onChange={(e) => setFormProdDate(e.target.value)}
                  min={formHomoEnd || undefined}
                  className="input-field"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-md btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="btn btn-md btn-primary"
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
