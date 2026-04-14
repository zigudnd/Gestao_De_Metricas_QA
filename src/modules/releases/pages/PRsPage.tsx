import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReleaseStore } from '../store/releaseStore'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/app/components/Toast'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { listMySquads, type Squad } from '@/modules/squads/services/squadsService'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { ReleasePR } from '../types/pr.types'
import { getMasterIndex, loadFromStorage } from '@/modules/sprints/services/persistence'
import { PRAnalysisPanel } from '../components/prs/PRAnalysisPanel'
import { ConfirmModal } from '@/app/components/ConfirmModal'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const REVIEW_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
  approved: { label: 'Aprovado', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
  rejected: { label: 'Rejeitado', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  feature: { label: 'Feature', color: 'var(--color-blue)' },
  fix: { label: 'Fix', color: 'var(--color-red)' },
  refactor: { label: 'Refactor', color: '#8b5cf6' },
  hotfix: { label: 'Hotfix', color: '#f97316' },
}

const SORT_COLUMNS = [
  { key: 'pr', label: 'PR' },
  { key: 'squad', label: 'Squad' },
  { key: 'type', label: 'Tipo' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Data' },
] as const

const TH_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  padding: '8px 14px', textAlign: 'left', cursor: 'pointer',
  userSelect: 'none', border: 'none', background: 'none',
  whiteSpace: 'nowrap',
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 28px 8px 10px', borderRadius: 7,
  border: '1px solid var(--color-border-md)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)', cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

const STATUS_LABEL: Record<string, string> = {
  planejada: 'Planejada',
  em_desenvolvimento: 'Em Desenvolvimento',
  corte: 'Em Corte',
  em_homologacao: 'Em Homologação',
  em_regressivo: 'Em Regressivo',
  em_qa: 'Em QA',
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovada: 'Aprovada',
  em_producao: 'Em Produção',
  concluida: 'Concluída',
  uniu_escopo: 'Uniu Escopo',
  rollback: 'Rollback',
  cancelada: 'Cancelada',
}

function releaseStatusBadge(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: 0.3,
  }
  switch (status) {
    case 'em_producao': case 'concluida':
      return { ...base, background: 'var(--color-green-light)', color: 'var(--color-green)' }
    case 'corte':
      return { ...base, background: '#ede9fe', color: '#8b5cf6' }
    case 'aprovada': case 'aguardando_aprovacao':
      return { ...base, background: 'var(--color-blue-light)', color: 'var(--color-blue)' }
    case 'em_regressivo': case 'em_homologacao': case 'em_qa':
      return { ...base, background: 'var(--color-amber-light)', color: 'var(--color-amber)' }
    case 'uniu_escopo':
      return { ...base, background: '#8b5cf618', color: '#8b5cf6' }
    default:
      return { ...base, background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PRsPage() {
  const navigate = useNavigate()
  const { releases, load } = useReleaseStore()
  const { user } = useAuthStore()
  const [prs, setPrs] = useState<ReleasePR[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRelease, setFilterRelease] = useState<string>('all')
  const [selectedPR, setSelectedPR] = useState<ReleasePR | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortCol, setSortCol] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [])

  const handleSort = useCallback((col: string) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
        return col
      }
      setSortDir('asc')
      return col
    })
  }, [])

  // ── Form state ──
  const [showForm, setShowForm] = useState(false)
  const [formReleaseId, setFormReleaseId] = useState('')
  const [formPrLink, setFormPrLink] = useState('')
  const [formRepo, setFormRepo] = useState('')
  const [formCustomRepo, setFormCustomRepo] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('feature')
  const [formSquadId, setFormSquadId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [editPrId, setEditPrId] = useState<string | null>(null)
  const [rejectingPrId, setRejectingPrId] = useState<string | null>(null)
  const [rejectObs, setRejectObs] = useState('')
  const [deletingPrId, setDeletingPrId] = useState<string | null>(null)

  const closeModal = useCallback(() => setShowForm(false), [])
  const modalRef = useFocusTrap(showForm, closeModal)

  const REPOSITORIES = ['app-ios', 'app-android', 'bff-mobile', 'api-gateway', 'design-system', 'infra-mobile', 'Outro']
  const CHANGE_TYPES = [
    { value: 'feature', label: 'Feature', color: 'var(--color-blue)' },
    { value: 'fix', label: 'Fix', color: 'var(--color-red)' },
    { value: 'refactor', label: 'Refactor', color: '#8b5cf6' },
    { value: 'hotfix', label: 'Hotfix', color: '#f97316' },
  ]

  // Releases disponveis para cadastro de PR (em corte ou em desenvolvimento)
  const releasesEmCorte = useMemo(() => {
    const statusPermitidos = ['corte', 'em_desenvolvimento', 'planejada']
    if (import.meta.env.DEV && releases.length > 0) {
      console.log('[PRsPage] Releases no store:', releases.map(r => `${r.version}(${r.status})`))
    }
    return releases.filter((r) => statusPermitidos.includes(r.status))
  }, [releases])

  // Squads do sistema
  const [availableSquads, setAvailableSquads] = useState<Squad[]>([])
  useEffect(() => {
    listMySquads()
      .then(setAvailableSquads)
      .catch((e) => { if (import.meta.env.DEV) console.warn('[PRs] Failed to load squads:', e) })
  }, [])

  function resetForm() {
    setFormReleaseId('')
    setFormPrLink('')
    setFormRepo('')
    setFormCustomRepo('')
    setFormDesc('')
    setFormType('feature')
    setFormSquadId('')
    setFormErrors({})
    setEditPrId(null)
  }

  // ── PR actions ──
  async function handleApprovePR(prId: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { error } = await supabase.from('release_prs').update({
      review_status: 'approved',
      reviewed_by: authUser?.id,
      reviewed_at: new Date().toISOString(),
      review_observation: null,
    }).eq('id', prId)
    if (error) { showToast(error.message || 'Erro ao aprovar', 'error'); return }
    showToast('PR aprovado', 'success')
    loadPRs()
  }

  async function handleConfirmReject() {
    if (!rejectingPrId) return
    if (!rejectObs || rejectObs.trim().length < 3) { showToast('Informe o motivo da rejeição (mínimo 3 caracteres)', 'error'); return }
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { error } = await supabase.from('release_prs').update({
      review_status: 'rejected',
      reviewed_by: authUser?.id,
      reviewed_at: new Date().toISOString(),
      review_observation: rejectObs.trim(),
    }).eq('id', rejectingPrId)
    if (error) { showToast(error.message || 'Erro ao rejeitar', 'error'); return }
    showToast('PR rejeitado', 'success')
    setRejectingPrId(null)
    setRejectObs('')
    loadPRs()
  }

  async function handleConfirmDelete() {
    if (!deletingPrId) return
    const { error } = await supabase.from('release_prs').delete().eq('id', deletingPrId)
    if (error) { showToast(error.message || 'Erro ao excluir', 'error'); return }
    showToast('PR excluído', 'success')
    setDeletingPrId(null)
    loadPRs()
  }

  async function handleCreatePR(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!formReleaseId) errors.release = 'Selecione uma release'
    if (!formPrLink || !/^https?:\/\//.test(formPrLink)) errors.prLink = 'Informe um link valido (http/https)'
    const repo = formRepo === 'Outro' ? formCustomRepo.trim() : formRepo
    if (!repo) errors.repo = 'Selecione ou informe o repositorio'

    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    setFormErrors({})

    setSaving(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setFormErrors({ submit: 'Sessao expirada. Faca login novamente.' }); setSaving(false); return }

      const payload = {
        release_id: formReleaseId,
        pr_link: formPrLink.trim(),
        repository: repo,
        description: formDesc.trim() || '',
        change_type: formType,
        squad_id: formSquadId || null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let queryError: any = null

      if (editPrId) {
        const result = await supabase.from('release_prs').update({ ...payload, review_status: 'pending', reviewed_by: null, reviewed_at: null, review_observation: null }).eq('id', editPrId)
        queryError = result.error
      } else {
        const result = await supabase.from('release_prs').insert({ ...payload, user_id: authUser.id })
        queryError = result.error
      }

      if (queryError) {
        if (queryError.code === '42P01') {
          setFormErrors({ submit: 'Tabela release_prs nao encontrada. Execute a migration: supabase db push --local' })
        } else {
          setFormErrors({ submit: queryError.message || (editPrId ? 'Erro ao atualizar PR' : 'Erro ao cadastrar PR') })
        }
        setSaving(false)
        return
      }
      showToast(editPrId ? 'PR atualizado com sucesso' : 'PR cadastrado com sucesso', 'success')
      setShowForm(false)
      resetForm()
      loadPRs()
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'Erro ao cadastrar PR' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    load()
    loadPRs()
  }, []) // eslint-disable-line

  async function loadPRs() {
    setLoading(true)
    try {
      let data: Record<string, unknown>[] | null = null
      let error: { message: string } | null = null

      const result = await supabase
        .from('release_prs')
        .select('*')
        .order('created_at', { ascending: false })
      data = result.data
      error = result.error as { message: string } | null

      if (error) {
        if (import.meta.env.DEV) console.warn('[PRs] Query error:', error.message)
        setPrs([])
        return
      }

      const userIds = [...new Set((data ?? []).map((r) => r.user_id as string).filter(Boolean))]
      const emailMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)
        ;(profiles ?? []).forEach((p: Record<string, string>) => emailMap.set(p.id, p.email))
      }

      const reviewerIds = [...new Set((data ?? []).map((r) => r.reviewed_by as string).filter(Boolean))]
      const reviewerEmailMap = new Map<string, string>()
      if (reviewerIds.length > 0) {
        // Reuse already-fetched author emails where possible
        const missingIds = reviewerIds.filter(id => !emailMap.has(id))
        if (missingIds.length > 0) {
          const { data: reviewerProfiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', missingIds)
          ;(reviewerProfiles ?? []).forEach((p: Record<string, string>) => reviewerEmailMap.set(p.id, p.email))
        }
        // Merge author emails that are also reviewers
        for (const rid of reviewerIds) {
          if (!reviewerEmailMap.has(rid) && emailMap.has(rid)) {
            reviewerEmailMap.set(rid, emailMap.get(rid)!)
          }
        }
      }

      const squadIds = [...new Set((data ?? []).map((r) => r.squad_id as string).filter(Boolean))]
      const squadMap = new Map<string, string>()
      if (squadIds.length > 0) {
        const { data: squads } = await supabase
          .from('squads')
          .select('id, name')
          .in('id', squadIds)
        ;(squads ?? []).forEach((s: Record<string, string>) => squadMap.set(s.id, s.name))
      }

      setPrs((data ?? []).map((r) => ({
        ...r,
        user_email: emailMap.get(r.user_id as string) ?? '',
        reviewed_by_email: r.reviewed_by ? (reviewerEmailMap.get(r.reviewed_by as string) ?? null) : null,
        squad_name: squadMap.get(r.squad_id as string) ?? '',
      })) as ReleasePR[])
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[PRs] Failed to load:', e)
      setPrs([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const needle = debouncedSearch.toLowerCase().trim()
    const result = prs.filter((pr) => {
      if (filterStatus !== 'all' && pr.review_status !== filterStatus) return false
      if (filterRelease !== 'all' && pr.release_id !== filterRelease) return false
      if (needle) {
        const haystack = [pr.repository, pr.description, pr.pr_link, pr.squad_name].join(' ').toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })

    result.sort((a, b) => {
      let valA = ''
      let valB = ''

      switch (sortCol) {
        case 'pr':
          valA = (a.repository ?? '').toLowerCase()
          valB = (b.repository ?? '').toLowerCase()
          break
        case 'squad':
          valA = (a.squad_name ?? '').toLowerCase()
          valB = (b.squad_name ?? '').toLowerCase()
          break
        case 'type':
          valA = (a.change_type ?? '').toLowerCase()
          valB = (b.change_type ?? '').toLowerCase()
          break
        case 'status':
          valA = (a.review_status ?? '').toLowerCase()
          valB = (b.review_status ?? '').toLowerCase()
          break
        case 'created_at':
          valA = a.created_at ?? ''
          valB = b.created_at ?? ''
          break
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [prs, filterStatus, filterRelease, debouncedSearch, sortCol, sortDir, releases])

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((p) => p.review_status === 'pending').length,
    approved: filtered.filter((p) => p.review_status === 'approved').length,
    rejected: filtered.filter((p) => p.review_status === 'rejected').length,
  }), [filtered])

  const releaseOptions = useMemo(() => {
    const ids = [...new Set(prs.map((p) => p.release_id))]
    return ids.map((id) => {
      const rel = releases.find((r) => r.id === id)
      return { id, label: rel ? `${rel.version} — ${rel.title}` : id }
    })
  }, [prs, releases])

  const groupedByRelease = useMemo(() => {
    const groups = new Map<string, { release: typeof releases[0] | undefined; prs: typeof filtered }>()
    for (const pr of filtered) {
      if (!groups.has(pr.release_id)) {
        groups.set(pr.release_id, { release: releases.find(r => r.id === pr.release_id), prs: [] })
      }
      groups.get(pr.release_id)!.prs.push(pr)
    }
    return Array.from(groups.values()).sort((a, b) =>
      (b.release?.productionDate ?? '').localeCompare(a.release?.productionDate ?? '')
    )
  }, [filtered, releases])

  const testCompliance = useMemo(() => {
    const sprintIndex = getMasterIndex()
    const result: Record<string, { total: number; withTests: number }> = {}

    for (const group of groupedByRelease) {
      const releaseId = group.release?.id
      if (!releaseId) continue

      const approvedSquads = new Set(
        group.prs
          .filter(p => p.review_status === 'approved' && p.squad_id)
          .map(p => p.squad_id)
      )
      if (approvedSquads.size === 0) continue

      const linkedSprints = sprintIndex.filter(
        s => s.sprintType === 'integrado' && s.releaseId === releaseId
      )
      if (linkedSprints.length === 0) continue

      let squadsWithTests = 0
      for (const squadId of approvedSquads) {
        const hasTests = linkedSprints.some(s => {
          const data = loadFromStorage(s.id)
          return data && data.features.some(f => f.squadId === squadId)
        })
        if (hasTests) squadsWithTests++
      }

      result[releaseId] = { total: approvedSquads.size, withTests: squadsWithTests }
    }
    return result
  }, [groupedByRelease])

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Keep all groups expanded by default when groupedByRelease changes
  useEffect(() => {
    setExpandedGroups(new Set(groupedByRelease.map(g => g.release?.id ?? 'unknown')))
  }, [groupedByRelease])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const formError = Object.values(formErrors).filter(Boolean).join('. ')

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Carregando PRs...</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Gestão de PRs
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '4px 0 0' }}>
            PRs cadastrados em releases na etapa de corte
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          disabled={releasesEmCorte.length === 0}
          title={releasesEmCorte.length === 0 ? 'Nenhuma release em etapa de corte' : 'Cadastrar novo PR'}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: releasesEmCorte.length === 0 ? 'var(--color-border-md)' : 'var(--color-blue)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: releasesEmCorte.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-family-sans)', flexShrink: 0,
          }}
        >
          + Cadastrar PR
        </button>
      </div>

      {releasesEmCorte.length === 0 && prs.length === 0 && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 8,
          background: 'var(--color-amber-light)', border: '1px solid var(--color-amber)',
          fontSize: 13, color: 'var(--color-amber)',
        }}>
          Nenhuma release disponível para cadastro de PRs. Crie uma release ou altere o status para &quot;Em Corte&quot; no Pipeline.
        </div>
      )}

      {/* Modal de cadastro */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label={editPrId ? 'Editar PR' : 'Cadastrar PR'}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 14, padding: '24px 22px', width: '100%', maxWidth: 500,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {editPrId ? 'Editar PR' : 'Cadastrar PR'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--color-text-3)', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreatePR} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Release */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Release *
                </label>
                <select
                  value={formReleaseId}
                  onChange={(e) => setFormReleaseId(e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="">— Selecione a release —</option>
                  {releasesEmCorte.map((r) => (
                    <option key={r.id} value={r.id}>{r.version} — {r.title}</option>
                  ))}
                </select>
              </div>

              {/* Link do PR */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Link do PR *
                </label>
                <input
                  type="url"
                  value={formPrLink}
                  onChange={(e) => setFormPrLink(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/123"
                  required
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7,
                    border: '1px solid var(--color-border-md)', fontSize: 13,
                    fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                    background: 'var(--color-surface)', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Repositório */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Repositório *
                </label>
                <select
                  value={formRepo}
                  onChange={(e) => setFormRepo(e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="">— Selecione —</option>
                  {REPOSITORIES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {formRepo === 'Outro' && (
                  <input
                    value={formCustomRepo}
                    onChange={(e) => setFormCustomRepo(e.target.value)}
                    placeholder="Nome do repositório"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 7, marginTop: 6,
                      border: '1px solid var(--color-border-md)', fontSize: 13,
                      fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                      background: 'var(--color-surface)', boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              {/* Squad */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Squad
                </label>
                <select
                  value={formSquadId}
                  onChange={(e) => setFormSquadId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Sem squad —</option>
                  {availableSquads.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Descrição
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Breve descrição da mudança..."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7, resize: 'vertical',
                    border: '1px solid var(--color-border-md)', fontSize: 13,
                    fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                    background: 'var(--color-surface)', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Tipo de mudança */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tipo de mudança
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {CHANGE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormType(t.value)}
                      style={{
                        flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                        border: formType === t.value ? `2px solid ${t.color}` : '1px solid var(--color-border-md)',
                        background: formType === t.value ? 'var(--color-blue-light)' : 'transparent',
                        color: formType === t.value ? t.color : 'var(--color-text-2)',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Erro */}
              {formError && (
                <div style={{
                  padding: '8px 12px', borderRadius: 7, fontSize: 13,
                  background: 'var(--color-red-light)', color: 'var(--color-red)',
                  border: '1px solid var(--color-red)',
                }}>
                  {formError}
                </div>
              )}

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 7, border: '1px solid var(--color-border-md)',
                    background: 'transparent', color: 'var(--color-text)', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 18px', borderRadius: 7, border: 'none',
                    background: 'var(--color-blue)', color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                    fontFamily: 'var(--font-family-sans)',
                  }}
                >
                  {saving ? 'Salvando...' : editPrId ? 'Salvar alterações' : 'Cadastrar PR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de PRs', value: stats.total, color: 'var(--color-blue)', filter: 'all' },
          { label: 'Pendentes', value: stats.pending, color: 'var(--color-amber)', filter: 'pending' },
          { label: 'Aprovados', value: stats.approved, color: 'var(--color-green)', filter: 'approved' },
          { label: 'Rejeitados', value: stats.rejected, color: 'var(--color-red)', filter: 'rejected' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            role="button"
            tabIndex={0}
            onClick={() => setFilterStatus(kpi.filter)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterStatus(kpi.filter) } }}
            aria-label={`Filtrar por ${kpi.label}`}
            aria-pressed={filterStatus === kpi.filter}
            style={{
              background: filterStatus === kpi.filter ? `color-mix(in srgb, ${kpi.color} 8%, var(--color-surface))` : 'var(--color-surface)',
              border: filterStatus === kpi.filter ? `2px solid ${kpi.color}` : '1px solid var(--color-border)',
              borderRadius: 10, padding: '14px 16px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, marginTop: 4 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por repositório, descrição ou link..."
          aria-label="Buscar PRs"
          style={{
            padding: '6px 10px', fontSize: 13, borderRadius: 7,
            border: '1px solid var(--color-border-md)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)',
            minWidth: 220, flex: '1 1 220px', maxWidth: 360, boxSizing: 'border-box',
          }}
        />

        <select
          value={filterRelease}
          onChange={(e) => setFilterRelease(e.target.value)}
          aria-label="Filtrar por release"
          style={{ ...selectStyle, width: 'auto' }}
        >
          <option value="all">Todas as releases</option>
          {releaseOptions.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>

        {['all', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20,
              border: filterStatus === s ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border-md)',
              background: filterStatus === s ? 'var(--color-blue-light)' : 'transparent',
              color: filterStatus === s ? 'var(--color-blue-text)' : 'var(--color-text-2)',
              cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
            }}
          >
            {s === 'all' ? 'Todos' : REVIEW_BADGE[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Grouped by Release */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 12, color: 'var(--color-text-3)', fontSize: 14,
        }}>
          {prs.length === 0
            ? 'Nenhum PR cadastrado. Acesse uma release em etapa de Corte para cadastrar PRs.'
            : 'Nenhum PR corresponde aos filtros aplicados.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groupedByRelease.map((group) => {
            const groupId = group.release?.id ?? 'unknown'
            const isExpanded = expandedGroups.has(groupId)
            const groupApproved = group.prs.filter(p => p.review_status === 'approved').length
            const groupPending = group.prs.filter(p => p.review_status === 'pending').length
            const groupRejected = group.prs.filter(p => p.review_status === 'rejected').length

            return (
              <div key={groupId} style={{
                border: '1px solid var(--color-border)',
                borderRadius: 12, overflow: 'hidden',
                background: 'var(--color-surface)',
              }}>
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(groupId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(groupId) } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
                    background: 'var(--color-surface-2)',
                    borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{
                    fontSize: 12, color: 'var(--color-text-3)',
                    transition: 'transform 0.15s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    display: 'inline-block', width: 16, textAlign: 'center',
                  }}>
                    {'\u25B6'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                    {group.release ? `${group.release.version} — ${group.release.title}` : 'Release desconhecida'}
                  </span>
                  {group.release && (
                    <span style={releaseStatusBadge(group.release.status)}>
                      {STATUS_LABEL[group.release.status] ?? group.release.status}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {group.prs.length} PRs
                    <span style={{ margin: '0 4px' }}>&middot;</span>
                    <span style={{ color: 'var(--color-green)' }}>{groupApproved} aprovados</span>
                    <span style={{ margin: '0 4px' }}>&middot;</span>
                    <span style={{ color: 'var(--color-amber)' }}>{groupPending} pendentes</span>
                    <span style={{ margin: '0 4px' }}>&middot;</span>
                    <span style={{ color: 'var(--color-red)' }}>{groupRejected} rejeitados</span>
                  </span>
                  {testCompliance[groupId] && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                      whiteSpace: 'nowrap', letterSpacing: 0.3,
                      background: testCompliance[groupId].withTests === testCompliance[groupId].total
                        ? 'var(--color-green-light)' : 'var(--color-amber-light)',
                      color: testCompliance[groupId].withTests === testCompliance[groupId].total
                        ? 'var(--color-green)' : 'var(--color-amber)',
                    }}>
                      {testCompliance[groupId].withTests === testCompliance[groupId].total
                        ? '\u2705 Testes ok'
                        : `\u26A0\uFE0F ${testCompliance[groupId].total - testCompliance[groupId].withTests} squads sem testes`
                      }
                    </span>
                  )}
                </div>

                {/* Group Table */}
                {isExpanded && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          {SORT_COLUMNS.map((col) => (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              style={TH_STYLE}
                            >
                              {col.label}
                              {sortCol === col.key ? (
                                <span style={{ marginLeft: 4, fontSize: 10 }}>
                                  {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
                                </span>
                              ) : null}
                            </th>
                          ))}
                          <th style={{ ...TH_STYLE, width: 180, textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.prs.map((pr) => {
                          const reviewBadge = REVIEW_BADGE[pr.review_status] ?? REVIEW_BADGE.pending
                          const typeBadge = TYPE_BADGE[pr.change_type] ?? TYPE_BADGE.feature
                          return (
                            <tr
                              key={pr.id}
                              onClick={() => setSelectedPR(pr)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPR(pr) } }}
                              style={{
                                borderBottom: '1px solid var(--color-border)',
                                cursor: 'pointer', transition: 'background 0.12s',
                                fontSize: 13,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <td style={{ padding: '10px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                                <a
                                  href={pr.pr_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: 'var(--color-blue)', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  {pr.repository}
                                </a>
                                <span style={{ color: 'var(--color-text-2)', marginLeft: 6 }}>
                                  {pr.description || '\u2014'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 120 }}>
                                {pr.squad_name || '\u2014'}
                              </td>
                              <td style={{ padding: '10px 14px', width: 90, textAlign: 'center' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                  color: typeBadge.color, background: 'var(--color-surface-2)',
                                }}>
                                  {typeBadge.label}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', width: 90, textAlign: 'center' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                  color: reviewBadge.color, background: reviewBadge.bg,
                                }}>
                                  {reviewBadge.label}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-3)', width: 90 }}>
                                {fmtDate(pr.created_at?.split('T')[0] ?? '')}
                              </td>
                              <td style={{ padding: '6px 8px', width: 180, textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  {pr.pr_link ? (
                                    <a
                                      href={pr.pr_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Abrir PR no navegador"
                                      aria-label="Abrir link do PR"
                                      style={{
                                        padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-blue)',
                                        background: 'var(--color-blue-light)', color: 'var(--color-blue)',
                                        fontSize: 11, fontWeight: 700, textDecoration: 'none',
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                      }}
                                    >
                                      Link
                                    </a>
                                  ) : (
                                    <span
                                      title="PR sem link cadastrado"
                                      style={{
                                        padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface-2)', color: 'var(--color-text-3)',
                                        fontSize: 11, fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                        opacity: 0.5,
                                      }}
                                    >
                                      Link
                                    </span>
                                  )}

                                  {pr.review_status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleApprovePR(pr.id)}
                                        title="Aprovar PR"
                                        aria-label="Aprovar PR"
                                        style={{
                                          padding: '4px 8px', borderRadius: 6, border: 'none',
                                          background: 'var(--color-green-light)', color: 'var(--color-green)',
                                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        }}
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        onClick={() => { setRejectingPrId(pr.id); setRejectObs('') }}
                                        title="Rejeitar PR"
                                        aria-label="Rejeitar PR"
                                        style={{
                                          padding: '4px 8px', borderRadius: 6, border: 'none',
                                          background: 'var(--color-red-light)', color: 'var(--color-red)',
                                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        }}
                                      >
                                        Rejeitar
                                      </button>
                                    </>
                                  )}
                                  {pr.review_status === 'rejected' && (
                                    <span style={{ fontSize: 11, color: 'var(--color-red)', fontWeight: 600 }}>Rejeitado</span>
                                  )}
                                  {pr.review_status === 'approved' && (
                                    <span style={{ fontSize: 11, color: 'var(--color-green)', fontWeight: 600 }}>Aprovado</span>
                                  )}

                                  <button
                                    onClick={() => setDeletingPrId(pr.id)}
                                    title="Excluir PR"
                                    aria-label="Excluir PR"
                                    style={{
                                      padding: '4px 6px', borderRadius: 6, border: 'none',
                                      background: 'transparent', color: 'var(--color-text-3)',
                                      fontSize: 11, cursor: 'pointer',
                                    }}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Painel de detalhes do PR */}
      {selectedPR && (
        <PRAnalysisPanel
          pr={{
            ...selectedPR,
            reviewed_by_email: selectedPR.reviewed_by_email ?? null,
          }}
          isFoundation={true}
          isOwner={selectedPR.user_id === user?.id}
          onApprove={async () => { await handleApprovePR(selectedPR.id); setSelectedPR(null) }}
          onReject={async (obs) => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            const { error } = await supabase.from('release_prs').update({
              review_status: 'rejected',
              reviewed_by: authUser?.id,
              reviewed_at: new Date().toISOString(),
              review_observation: obs,
            }).eq('id', selectedPR.id)
            if (error) { showToast(error.message || 'Erro ao rejeitar', 'error'); return }
            showToast('PR rejeitado', 'success')
            setSelectedPR(null)
            loadPRs()
          }}
          onEdit={() => {
            setEditPrId(selectedPR.id)
            setFormReleaseId(selectedPR.release_id)
            setFormPrLink(selectedPR.pr_link)
            setFormRepo(selectedPR.repository)
            setFormDesc(selectedPR.description)
            setFormType(selectedPR.change_type)
            setFormSquadId(selectedPR.squad_id ?? '')
            setSelectedPR(null)
            setShowForm(true)
          }}
          onDelete={() => { setDeletingPrId(selectedPR.id); setSelectedPR(null) }}
          onClose={() => setSelectedPR(null)}
        />
      )}

      {/* Modal de rejeição */}
      {rejectingPrId && (
        <div
          onClick={() => { setRejectingPrId(null); setRejectObs('') }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Rejeitar PR"
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderTop: '3px solid var(--color-red)', borderRadius: 12, padding: 24,
              width: '100%', maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
              Rejeitar PR
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              Informe o motivo da rejeição (obrigatório, mínimo 3 caracteres):
            </div>
            <textarea
              value={rejectObs}
              onChange={(e) => setRejectObs(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
              autoFocus
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 7, resize: 'vertical',
                border: '1px solid var(--color-border-md)', fontSize: 13,
                fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                background: 'var(--color-surface)', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => { setRejectingPrId(null); setRejectObs('') }}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)',
                  background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejectObs.trim().length < 3}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none',
                  background: rejectObs.trim().length < 3 ? 'var(--color-border-md)' : 'var(--color-red)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: rejectObs.trim().length < 3 ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingPrId && (
        <ConfirmModal
          title="Excluir PR"
          description="Tem certeza que deseja excluir este PR? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingPrId(null)}
        />
      )}
    </div>
  )
}
