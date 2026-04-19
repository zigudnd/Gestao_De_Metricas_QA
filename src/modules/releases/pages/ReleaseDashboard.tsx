import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReleaseStore } from '../store/releaseStore'
import type { Release, ReleaseStatus } from '../types/release.types'
import type { Platform } from '../constants/platforms'
import { showToast } from '@/app/components/Toast'
import { ReleasePhasesPanel } from '../components/dashboard/ReleasePhasesPanel'
import { STATUS_LABELS, STATUS_COLORS, STATUS_BG_COLORS } from '../constants/status'

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
function IconArrowLeft({ size = 14 }: { size?: number }) {
  return <Svg size={size}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>
}
function IconPackage({ size = 26 }: { size?: number }) {
  return <Svg size={size}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Svg>
}
function IconApple({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" /><path d="M10 2c1 .5 2 2 2 5" /></Svg>
}
function IconAndroid({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></Svg>
}
function IconGlobe({ size = 14 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>
}
function IconLink2({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" /><line x1="8" y1="12" x2="16" y2="12" /></Svg>
}
function IconServer({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></Svg>
}
function IconCloud({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></Svg>
}
function IconChevronRight({ size = 14 }: { size?: number }) {
  return <Svg size={size}><polyline points="9 18 15 12 9 6" /></Svg>
}

const PLATFORM_ICON_COMP: Record<Platform, React.ComponentType<{ size?: number }>> = {
  iOS: IconApple, Android: IconAndroid, Front: IconGlobe,
  BFF: IconLink2, Back: IconServer, Infra: IconCloud,
}

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
  const [historyOpen, setHistoryOpen] = useState(false)

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
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '56px 20px', textAlign: 'center' }}>
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
          <IconPackage />
        </div>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
          Release não encontrada
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
          Essa release pode ter sido excluída ou o link está inválido.
        </p>
        <button
          onClick={() => navigate('/releases')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-blue)',
            background: 'var(--color-blue)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
          }}
        >
          <IconArrowLeft /> Voltar para Releases
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
      <style>{`
        .rd-back-btn:hover { background: var(--color-bg); color: var(--color-text); }
        .rd-history-toggle:hover { background: var(--color-bg); color: var(--color-text); }
      `}</style>
      {/* Top bar */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/releases')}
          aria-label="Voltar para lista de releases"
          title="Voltar para Releases"
          className="rd-back-btn"
          style={{
            width: 32, height: 32, borderRadius: 7, border: 'none',
            background: 'var(--color-surface-2)', cursor: 'pointer',
            color: 'var(--color-text-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          <IconArrowLeft />
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['iOS', 'Android', 'Front', 'BFF', 'Back', 'Infra'] as const).map((p) => {
              const active = (release.platforms || []).includes(p)
              const PIcon = PLATFORM_ICON_COMP[p]
              return (
                <button
                  key={p}
                  disabled={isConcluida}
                  aria-pressed={active}
                  aria-label={`Selecionar plataforma ${p}`}
                  onClick={() => {
                    const current = release.platforms || []
                    const next = active ? current.filter((x) => x !== p) : [...current, p]
                    handleField('platforms', next)
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                    cursor: isConcluida ? 'default' : 'pointer', fontFamily: 'var(--font-family-sans)',
                    border: `1px solid ${active ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                    background: active ? 'var(--color-blue-light)' : 'transparent',
                    color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                    opacity: isConcluida ? 0.6 : 1,
                    transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                  }}
                >
                  <PIcon size={13} /> {p}
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

        {/* Status history (collapsible) */}
        {release.statusHistory.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              aria-controls="rd-history-content"
              className="rd-history-toggle"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 6,
                background: 'transparent', border: 'none',
                fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
                cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  transform: historyOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
              >
                <IconChevronRight />
              </span>
              Histórico de transições ({release.statusHistory.length})
            </button>
            {historyOpen && (
              <div id="rd-history-content" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
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
                    <span aria-hidden="true" style={{ color: 'var(--color-text-3)' }}>→</span>
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
