import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { showToast } from '@/app/components/Toast'
import { PRRegistrationForm } from './PRRegistrationForm'
import { PRListTable } from './PRListTable'
import { PRAnalysisPanel } from './PRAnalysisPanel'
import { exportPRsCSV } from '../../services/prService'
import type { ReleasePR, PRFilters, ChangeType, ReviewStatus } from '../../types/pr.types'
import { btnPrimary, btnOutline } from '@/styles/shared'

// ─── Props ──────────────────────────────────────────────────────────────────

interface PRsTabProps {
  releaseId: string
  releaseStatus: string
  cutoffDate: string
  squads: Array<{ id: string; name: string }>
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const kpiValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--color-text)',
  lineHeight: 1.2,
}

const kpiLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const modalContent: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderTop: '3px solid var(--color-blue)',
  borderRadius: 12,
  padding: 24,
  width: '100%',
  maxWidth: 520,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-xl)',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isCutoffPast(cutoffDate: string): boolean {
  if (!cutoffDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(cutoffDate + 'T23:59:59')
  return cutoff < today
}

function canRegisterPR(releaseStatus: string, cutoffDate: string): boolean {
  const allowedStatuses = ['corte', 'em_desenvolvimento', 'planejada']
  return allowedStatuses.includes(releaseStatus) && !isCutoffPast(cutoffDate)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PRsTab({ releaseId, releaseStatus, cutoffDate, squads }: PRsTabProps) {
  const profile = useAuthStore((s) => s.profile)
  const isFoundation = profile?.global_role === 'admin' || profile?.global_role === 'gerente'

  // ── State ───────────────────────────────────────────────────────────────
  const [prs, setPrs] = useState<ReleasePR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PRFilters>({})
  const [selectedPR, setSelectedPR] = useState<ReleasePR | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPR, setEditingPR] = useState<ReleasePR | null>(null)

  // ── Fetch PRs (direct Supabase) ─────────────────────────────────────────
  const fetchPRs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('release_prs')
        .select(`
          *,
          profiles:user_id ( email ),
          reviewer:reviewed_by ( email ),
          squads:squad_id ( name )
        `)
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false })

      if (filters.squad_id) query = query.eq('squad_id', filters.squad_id)
      if (filters.review_status) query = query.eq('review_status', filters.review_status)
      if (filters.change_type) query = query.eq('change_type', filters.change_type)

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const mapped: ReleasePR[] = (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        user_email: (row.profiles as Record<string, unknown> | null)?.email as string | undefined,
        reviewed_by_email: (row.reviewer as Record<string, unknown> | null)?.email as string | undefined,
        squad_name: (row.squads as Record<string, unknown> | null)?.name as string | undefined,
      })) as ReleasePR[]

      setPrs(mapped)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar PRs'
      setError(msg)
      if (import.meta.env.DEV) console.warn('[PRsTab] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [releaseId, filters])

  useEffect(() => { fetchPRs() }, [fetchPRs])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = prs.length
    const approved = prs.filter((p) => p.review_status === 'approved').length
    const pending = prs.filter((p) => p.review_status === 'pending').length
    const rejected = prs.filter((p) => p.review_status === 'rejected').length
    return { total, approved, pending, rejected }
  }, [prs])

  // ── CRUD handlers (direct Supabase) ─────────────────────────────────────

  async function handleCreatePR(data: {
    pr_link: string
    repository: string
    description: string
    change_type: string
    squad_id: string
  }) {
    const userId = profile?.id
    if (!userId) throw new Error('Usuário não autenticado')

    const { error: insertError } = await supabase.from('release_prs').insert({
      release_id: releaseId,
      user_id: userId,
      pr_link: data.pr_link,
      repository: data.repository,
      description: data.description,
      change_type: data.change_type,
      squad_id: data.squad_id || null,
    })

    if (insertError) throw insertError

    showToast('PR cadastrado com sucesso', 'success')
    setShowForm(false)
    fetchPRs()
  }

  async function handleUpdatePR(data: {
    pr_link: string
    repository: string
    description: string
    change_type: string
    squad_id: string
  }) {
    if (!editingPR) return

    const { error: updateError } = await supabase
      .from('release_prs')
      .update({
        pr_link: data.pr_link,
        repository: data.repository,
        description: data.description,
        change_type: data.change_type,
        squad_id: data.squad_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingPR.id)

    if (updateError) throw updateError

    showToast('PR atualizado com sucesso', 'success')
    setEditingPR(null)
    setShowForm(false)
    fetchPRs()
  }

  async function handleDeletePR(prId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('release_prs')
        .delete()
        .eq('id', prId)

      if (deleteError) throw deleteError

      showToast('PR removido', 'success')
      if (selectedPR?.id === prId) setSelectedPR(null)
      fetchPRs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir PR'
      showToast(msg, 'error')
    }
  }

  async function handleApprove() {
    if (!selectedPR || !profile) return

    try {
      const { error: reviewError } = await supabase
        .from('release_prs')
        .update({
          review_status: 'approved',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_observation: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPR.id)

      if (reviewError) throw reviewError

      showToast('PR aprovado', 'success')
      setSelectedPR(null)
      fetchPRs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar PR'
      showToast(msg, 'error')
    }
  }

  async function handleReject(observation: string) {
    if (!selectedPR || !profile) return

    try {
      const { error: reviewError } = await supabase
        .from('release_prs')
        .update({
          review_status: 'rejected',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_observation: observation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPR.id)

      if (reviewError) throw reviewError

      showToast('PR rejeitado', 'success')
      setSelectedPR(null)
      fetchPRs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao rejeitar PR'
      showToast(msg, 'error')
    }
  }

  async function handleTableReview(prId: string, status: 'approved' | 'rejected', observation?: string) {
    if (!profile) return

    try {
      const { error: reviewError } = await supabase
        .from('release_prs')
        .update({
          review_status: status,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_observation: observation || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prId)

      if (reviewError) throw reviewError

      showToast(`PR ${status === 'approved' ? 'aprovado' : 'rejeitado'}`, 'success')
      fetchPRs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao revisar PR'
      showToast(msg, 'error')
    }
  }

  function openEdit(pr: ReleasePR) {
    if (!canRegister) {
      showToast('Prazo de cadastro encerrado — não é possível editar', 'error')
      return
    }
    setEditingPR(pr)
    setShowForm(true)
  }

  function openCreate() {
    setEditingPR(null)
    setShowForm(true)
  }

  const canRegister = canRegisterPR(releaseStatus, cutoffDate)

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={card}>
          <span style={kpiValue}>{kpis.total}</span>
          <span style={kpiLabel}>Total PRs</span>
        </div>
        <div style={card}>
          <span style={{ ...kpiValue, color: 'var(--color-green)' }}>{kpis.approved}</span>
          <span style={kpiLabel}>Aprovados</span>
        </div>
        <div style={card}>
          <span style={{ ...kpiValue, color: 'var(--color-amber)' }}>{kpis.pending}</span>
          <span style={kpiLabel}>Pendentes</span>
        </div>
        <div style={card}>
          <span style={{ ...kpiValue, color: 'var(--color-red)' }}>{kpis.rejected}</span>
          <span style={kpiLabel}>Rejeitados</span>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button
          onClick={openCreate}
          disabled={!canRegister}
          style={{
            ...btnPrimary,
            opacity: canRegister ? 1 : 0.5,
            cursor: canRegister ? 'pointer' : 'not-allowed',
          }}
          title={
            !canRegister
              ? isCutoffPast(cutoffDate)
                ? 'Prazo de cadastro encerrado'
                : 'Cadastro indisponivel neste status'
              : 'Cadastrar novo PR'
          }
        >
          + Cadastrar PR
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: 'var(--color-red-light)',
          border: '1px solid var(--color-red-mid)',
          color: 'var(--color-red)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button
            onClick={fetchPRs}
            style={{ ...btnOutline, fontSize: 12, padding: '4px 12px' }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)', fontSize: 13 }}>
          Carregando PRs...
        </div>
      )}

      {/* PR List Table (shared component) */}
      {!loading && (
        <PRListTable
          prs={prs}
          squads={squads}
          onFilterChange={(f) => setFilters({
            squad_id: f.squad_id,
            review_status: f.review_status as ReviewStatus | undefined,
            change_type: f.change_type as ChangeType | undefined,
          })}
          onPRClick={(prId) => {
            const pr = prs.find((p) => p.id === prId)
            if (pr) setSelectedPR(pr)
          }}
          onExportCSV={() => exportPRsCSV(prs)}
          isFoundation={isFoundation}
          onReview={handleTableReview}
        />
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div
          style={modalOverlay}
          onClick={(e) => e.target === e.currentTarget && (() => { setShowForm(false); setEditingPR(null) })()}
        >
          <div style={modalContent}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 16 }}>
              {editingPR ? 'Editar PR' : 'Cadastrar PR'}
            </div>
            <PRRegistrationForm
              releaseId={releaseId}
              cutoffDate={cutoffDate}
              squads={squads}
              editingPR={editingPR ? {
                id: editingPR.id,
                pr_link: editingPR.pr_link,
                repository: editingPR.repository,
                description: editingPR.description,
                change_type: editingPR.change_type,
                squad_id: editingPR.squad_id ?? '',
              } : null}
              onSubmit={editingPR ? handleUpdatePR : handleCreatePR}
              onCancel={() => { setShowForm(false); setEditingPR(null) }}
            />
          </div>
        </div>
      )}

      {/* ── Analysis Panel (shared component) ─────────────────────────── */}
      {selectedPR && (
        <PRAnalysisPanel
          pr={selectedPR}
          isFoundation={isFoundation}
          isOwner={isFoundation || selectedPR.user_id === profile?.id}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={() => openEdit(selectedPR)}
          onDelete={() => handleDeletePR(selectedPR.id)}
          onClose={() => setSelectedPR(null)}
        />
      )}
    </div>
  )
}
