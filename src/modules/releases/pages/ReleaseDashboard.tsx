import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReleaseStore } from '../store/releaseStore'
import type { Release, ReleaseStatus } from '../types/release.types'
import { showToast } from '@/app/components/Toast'
import { ReleasePhasesPanel } from '../components/dashboard/ReleasePhasesPanel'
import { STATUS_LABELS, STATUS_COLORS, STATUS_BG_COLORS } from '../constants/status'

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1px solid var(--color-border-md)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-2)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleaseDashboard() {
  const { releaseId } = useParams<{ releaseId: string }>()
  const navigate = useNavigate()
  const { releases, load, updateRelease, updateStatus, initRelease, resetRelease } = useReleaseStore()
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Carregando...</span>
      </div>
    )
  }

  if (!release) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--color-text-3)' }}>
          Release não encontrada.
        </div>
        <button
          onClick={() => navigate('/releases')}
          style={{
            marginTop: 16, padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--color-blue)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
          }}
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
    updateStatus(newStatus)
    showToast(`Status alterado para ${STATUS_LABELS[newStatus]}`, 'success')
  }

  const statusColor = STATUS_COLORS[release.status]
  const statusLabel = STATUS_LABELS[release.status]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/releases')}
          aria-label="Voltar para lista de releases"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600,
            padding: 0, marginBottom: 12, fontFamily: 'var(--font-family-sans)',
          }}
        >
          ← Releases
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {release.title || 'Release sem título'}
          </h1>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px',
            borderRadius: 5, background: 'var(--color-surface-2)',
            color: 'var(--color-text-2)', fontFamily: 'var(--font-family-mono)',
          }}>
            {release.version || '—'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px',
            borderRadius: 4, background: STATUS_BG_COLORS[release.status], color: statusColor,
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
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>
          Dados da Release
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Título</label>
            <input
              value={release.title}
              onChange={(e) => handleField('title', e.target.value)}
              disabled={isConcluida}
              placeholder="Ex: Release App Março"
              style={{ ...inputStyle, opacity: isConcluida ? 0.6 : 1 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Versão</label>
            <input
              value={release.version}
              onChange={(e) => handleField('version', e.target.value)}
              disabled={isConcluida}
              placeholder="Ex: v4.2.0"
              style={{ ...inputStyle, opacity: isConcluida ? 0.6 : 1 }}
            />
          </div>
        </div>

        {/* Plataformas */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Plataformas</label>
          <div style={{ display: 'flex', gap: 8 }}>
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
          <label style={labelStyle}>Notas</label>
          <textarea
            value={release.description}
            onChange={(e) => handleField('description', e.target.value)}
            disabled={isConcluida}
            placeholder="Notas sobre esta release..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', opacity: isConcluida ? 0.6 : 1 }}
          />
        </div>

        {/* Status history */}
        {release.statusHistory.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Histórico de transições</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {release.statusHistory.slice().reverse().map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--color-text-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontFamily: 'var(--font-family-mono)', minWidth: 110 }}>
                    {new Date(h.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: 'var(--color-surface-2)', color: 'var(--color-text-3)',
                  }}>
                    {STATUS_LABELS[h.from] || h.from}
                  </span>
                  <span style={{ color: 'var(--color-text-3)' }}>→</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: STATUS_BG_COLORS[h.to], color: STATUS_COLORS[h.to],
                    fontWeight: 600,
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
