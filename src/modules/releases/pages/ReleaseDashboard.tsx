import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReleaseStore } from '../store/releaseStore'
import type { Release, ReleaseStatus } from '../types/release.types'
import { showToast } from '@/app/components/Toast'
import { ReleasePhasesPanel } from '../components/dashboard/ReleasePhasesPanel'

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

const STATUS_BG_COLORS: Record<ReleaseStatus, string> = {
  planejada: 'var(--color-surface-2)',
  em_desenvolvimento: 'var(--color-blue-light)',
  corte: '#ede9fe',
  em_homologacao: 'var(--color-amber-light)',
  em_regressivo: '#fff7ed',
  aprovada: 'var(--color-green-light)',
  em_producao: '#ecfeff',
  concluida: 'var(--color-green-light)',
  uniu_escopo: '#ede9fe',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleaseDashboard() {
  const { releaseId } = useParams<{ releaseId: string }>()
  const navigate = useNavigate()
  const { releases, load, updateRelease, initRelease, resetRelease } = useReleaseStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { load(); setLoaded(true) }, []) // eslint-disable-line

  // Subscribe to Supabase Realtime for this release
  useEffect(() => {
    if (!releaseId) return
    initRelease(releaseId)
    return () => { resetRelease() }
  }, [releaseId]) // eslint-disable-line

  const release: Release | undefined = releases.find((r) => r.id === releaseId)

  if (!loaded) {
    return (
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <span className="text-body">Carregando...</span>
      </div>
    )
  }

  if (!release) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div className="text-body text-muted">
          Release não encontrada.
        </div>
        <button
          onClick={() => navigate('/releases')}
          className="btn btn-md btn-primary"
          style={{ marginTop: 16 }}
        >
          Voltar para Releases
        </button>
      </div>
    )
  }

  const isConcluida = release.status === 'concluida'

  function handleField(field: string, value: string | number | string[]) {
    if (!releaseId) return
    updateRelease(releaseId, { [field]: value })
  }

  function handleStatusTransition(newStatus: ReleaseStatus) {
    if (!releaseId || !release) return
    updateRelease(releaseId, {
      status: newStatus,
      statusHistory: [
        ...release.statusHistory,
        { from: release.status, to: newStatus, timestamp: new Date().toISOString(), reason: '' },
      ],
    })
    showToast(`Status alterado para ${STATUS_LABELS[newStatus]}`, 'success')
  }

  const statusColor = STATUS_COLORS[release.status]
  const statusLabel = STATUS_LABELS[release.status]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Top bar */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/releases')}
          aria-label="Voltar para lista de releases"
          className="btn btn-ghost"
          style={{ padding: 0, marginBottom: 12 }}
        >
          ← Releases
        </button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="heading-lg" style={{ fontSize: 20 }}>
            {release.title || 'Release sem título'}
          </h1>
          <span className="badge badge-neutral" style={{
            fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: 11,
          }}>
            {release.version || '—'}
          </span>
          <span className="badge" style={{
            fontSize: 10, fontWeight: 700,
            background: STATUS_BG_COLORS[release.status], color: statusColor,
          }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Pipeline de fases */}
      <ReleasePhasesPanel
        release={release}
        onUpdateField={handleField}
        onTransition={handleStatusTransition}
      />

      {/* Dados da Release — formulário de edição */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="heading-sm" style={{ fontSize: 13, marginBottom: 16 }}>
          Dados da Release
        </div>

        <div className="grid grid-cols-2 gap-3.5" style={{ marginBottom: 14 }}>
          <div>
            <label className="section-label">Título</label>
            <input
              value={release.title}
              onChange={(e) => handleField('title', e.target.value)}
              disabled={isConcluida}
              placeholder="Ex: Release App Março"
              className="input-field"
              style={{ opacity: isConcluida ? 0.6 : 1 }}
            />
          </div>
          <div>
            <label className="section-label">Versão</label>
            <input
              value={release.version}
              onChange={(e) => handleField('version', e.target.value)}
              disabled={isConcluida}
              placeholder="Ex: v4.2.0"
              className="input-field"
              style={{ opacity: isConcluida ? 0.6 : 1 }}
            />
          </div>
        </div>

        {/* Plataformas */}
        <div style={{ marginBottom: 14 }}>
          <label className="section-label">Plataformas</label>
          <div className="flex gap-2">
            {(['iOS', 'Android', 'Front', 'BFF', 'Back', 'Infra'] as const).map((p) => {
              const active = (release.platforms || []).includes(p)
              return (
                <button
                  key={p}
                  disabled={isConcluida}
                  aria-pressed={active}
                  aria-label={`Selecionar ${p}`}
                  onClick={() => {
                    const current = release.platforms || []
                    const next = active ? current.filter((x) => x !== p) : [...current, p]
                    handleField('platforms', next)
                  }}
                  style={{
                    padding: '6px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                    cursor: isConcluida ? 'default' : 'pointer', fontFamily: 'var(--font-family-sans)',
                    border: active ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                    background: active ? 'var(--color-blue-light)' : 'transparent',
                    color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                    opacity: isConcluida ? 0.6 : 1,
                  }}
                >
                  {{ iOS: '🍎', Android: '🤖', Front: '🌐', BFF: '🔗', Back: '🖥', Infra: '☁️' }[p]} {p}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="section-label">Notas</label>
          <textarea
            value={release.description}
            onChange={(e) => handleField('description', e.target.value)}
            disabled={isConcluida}
            placeholder="Notas sobre esta release..."
            rows={3}
            className="textarea-field"
            style={{ opacity: isConcluida ? 0.6 : 1 }}
          />
        </div>

        {/* Status history */}
        {release.statusHistory.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Histórico de transições</div>
            <div className="flex flex-col gap-1">
              {release.statusHistory.slice().reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-small">
                  <span style={{ fontFamily: 'var(--font-family-mono)', minWidth: 110, fontSize: 10 }} className="text-muted">
                    {new Date(h.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                    {STATUS_LABELS[h.from] || h.from}
                  </span>
                  <span className="text-muted">→</span>
                  <span className="badge" style={{
                    fontSize: 10, fontWeight: 600,
                    background: STATUS_BG_COLORS[h.to], color: STATUS_COLORS[h.to],
                  }}>
                    {STATUS_LABELS[h.to] || h.to}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
