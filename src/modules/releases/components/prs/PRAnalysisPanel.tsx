import { useState } from 'react'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { REVIEW_STATUS_CONFIG, CHANGE_TYPE_CONFIG, BADGE_RADIUS } from '../../constants/pr-constants'

interface PRData {
  id: string
  pr_link: string
  repository: string
  description: string
  change_type: string
  review_status: string
  user_email?: string
  squad_name?: string
  created_at: string
  updated_at: string
  reviewed_by?: string | null
  reviewed_by_email?: string | null
  reviewed_at?: string | null
  review_observation?: string | null
  test_commitment_date?: string | null
}

interface PRAnalysisPanelProps {
  pr: PRData
  isFoundation: boolean
  isOwner: boolean
  onApprove: () => Promise<void>
  onReject: (observation: string) => Promise<void>
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-3)', marginBottom: 3, textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const valueStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: 'var(--color-text)',
}

function formatDateTime(iso: string): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '\u2014'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

function formatDate(iso: string): string {
  if (!iso) return '\u2014'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return '\u2014'
  return `${d}/${m}/${y}`
}

const CHANGE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  feature: { bg: 'var(--color-blue-light)', color: CHANGE_TYPE_CONFIG.feature.color },
  fix: { bg: 'var(--color-red-light)', color: CHANGE_TYPE_CONFIG.fix.color },
  hotfix: { bg: 'var(--color-amber-light)', color: CHANGE_TYPE_CONFIG.hotfix.color },
  refactor: { bg: 'var(--color-surface-2)', color: CHANGE_TYPE_CONFIG.refactor.color },
}

const STATUS_CONFIG = Object.fromEntries(
  Object.entries(REVIEW_STATUS_CONFIG).map(([k, v]) => [k, { label: v.label, bg: v.bg, color: v.color }]),
) as Record<string, { label: string; bg: string; color: string }>

export function PRAnalysisPanel({
  pr, isFoundation, isOwner, onApprove, onReject, onEdit, onDelete, onClose,
}: PRAnalysisPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectObservation, setRejectObservation] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const panelRef = useFocusTrap(true, onClose)

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await onApprove()
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    const trimmed = rejectObservation.trim()
    if (trimmed.length < 10) {
      setRejectError('A observação deve ter pelo menos 10 caracteres.')
      return
    }
    setRejectError('')
    setActionLoading(true)
    try {
      await onReject(trimmed)
    } finally {
      setActionLoading(false)
    }
  }

  const prTitle = pr.pr_link
    ? pr.pr_link.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/pull\//, ' #')
    : 'PR sem link'

  const changeTypeStyle = CHANGE_TYPE_COLORS[pr.change_type] || { bg: 'var(--color-surface-2)', color: 'var(--color-text-3)' }
  const statusCfg = STATUS_CONFIG[pr.review_status] || STATUS_CONFIG.pending

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900 }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do PR"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 420, maxWidth: '95vw',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
          gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <a
              href={/^https?:\/\//.test(pr.pr_link) ? pr.pr_link : '#'}
              target="_blank"
              rel="noopener noreferrer"
              title={pr.pr_link}
              style={{
                fontSize: 14, fontWeight: 700, color: 'var(--color-blue-text)',
                textDecoration: 'none', display: 'block',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {prTitle}
            </a>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: BADGE_RADIUS,
                background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
              }}>
                {pr.repository}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: BADGE_RADIUS,
                background: changeTypeStyle.bg, color: changeTypeStyle.color,
                textTransform: 'capitalize',
              }}>
                {pr.change_type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'var(--color-surface-2)', cursor: 'pointer',
              fontSize: 14, color: 'var(--color-text-2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Description */}
          {pr.description && (
            <div>
              <div style={labelStyle}>Descricao</div>
              <div style={{
                ...valueStyle, fontSize: 13, lineHeight: 1.6,
                padding: '8px 10px', borderRadius: 6,
                background: 'var(--color-surface-2)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {pr.description}
              </div>
            </div>
          )}

          {/* Info section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Squad</div>
              <div style={valueStyle}>{pr.squad_name || '\u2014'}</div>
            </div>
            <div>
              <div style={labelStyle}>Dev</div>
              <div style={{ ...valueStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pr.user_email || '\u2014'}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Cadastrado em</div>
              <div style={valueStyle}>{formatDateTime(pr.created_at)}</div>
            </div>
            <div>
              <div style={labelStyle}>Atualizado em</div>
              <div style={valueStyle}>{formatDateTime(pr.updated_at)}</div>
            </div>
          </div>

          {/* Status section */}
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div>
              <div style={labelStyle}>Status da Revisao</div>
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: BADGE_RADIUS,
                background: statusCfg.bg, color: statusCfg.color,
                textTransform: 'uppercase',
              }}>
                {statusCfg.label}
              </span>
            </div>

            {pr.reviewed_by && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={labelStyle}>Revisado por</div>
                  <div style={{ ...valueStyle, fontSize: 12 }}>{pr.reviewed_by_email || pr.reviewed_by}</div>
                </div>
                <div>
                  <div style={labelStyle}>Data da Revisao</div>
                  <div style={{ ...valueStyle, fontSize: 12 }}>
                    {pr.reviewed_at ? formatDateTime(pr.reviewed_at) : '\u2014'}
                  </div>
                </div>
              </div>
            )}

            {/* Rejection observation */}
            {pr.review_status === 'rejected' && pr.review_observation && (
              <div style={{
                padding: '10px 12px', borderRadius: 6,
                background: 'var(--color-red-light)', border: '1px solid var(--color-red)',
              }}>
                <div style={{ ...labelStyle, color: 'var(--color-red)', marginBottom: 4 }}>
                  Motivo da Rejeicao
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-red)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {pr.review_observation}
                </div>
              </div>
            )}
          </div>

          {/* Test commitment section */}
          <div>
            <div style={labelStyle}>Compromisso de Testes</div>
            <div style={valueStyle}>
              {pr.test_commitment_date
                ? formatDate(pr.test_commitment_date)
                : 'Sem compromisso de testes'}
            </div>
          </div>

          {/* Foundation actions: Approve / Reject */}
          {isFoundation && pr.review_status === 'pending' && (
            <div style={{
              padding: '14px', borderRadius: 8,
              border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>Acoes de Revisao</div>

              {!showRejectForm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    style={{
                      flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: 'var(--color-green)', color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: actionLoading ? 'wait' : 'pointer',
                      fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
                      opacity: actionLoading ? 0.7 : 1,
                    }}
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    style={{
                      flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: 'var(--color-red)', color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: actionLoading ? 'wait' : 'pointer',
                      fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
                      opacity: actionLoading ? 0.7 : 1,
                    }}
                  >
                    Rejeitar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={rejectObservation}
                    onChange={(e) => { setRejectObservation(e.target.value); setRejectError('') }}
                    placeholder="Motivo da rejeicao (minimo 10 caracteres)..."
                    rows={3}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 6,
                      border: rejectError
                        ? '1px solid var(--color-red)'
                        : '1px solid var(--color-border-md)',
                      fontSize: 13, fontFamily: 'var(--font-family-sans)',
                      color: 'var(--color-text)', background: 'var(--color-surface)',
                      resize: 'vertical',
                    }}
                  />
                  {rejectError && (
                    <div style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 500 }}>
                      {rejectError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectObservation(''); setRejectError('') }}
                      style={{
                        padding: '7px 16px', borderRadius: 8,
                        border: '1px solid var(--color-border-md)',
                        background: 'transparent', color: 'var(--color-text-2)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: 'var(--color-red)', color: '#fff',
                        fontSize: 13, fontWeight: 600,
                        cursor: actionLoading ? 'wait' : 'pointer',
                        fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
                        opacity: actionLoading ? 0.7 : 1,
                      }}
                    >
                      Confirmar Rejeicao
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Owner actions: Edit / Delete */}
          {isOwner && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onEdit}
                style={{
                  flex: 1, padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--color-border-md)',
                  background: 'transparent', color: 'var(--color-text)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
                }}
              >
                Editar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--color-red-light)', color: 'var(--color-red)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)', transition: 'all 0.15s',
                }}
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Excluir PR"
          description="Tem certeza que deseja excluir este PR? Esta acao nao pode ser desfeita."
          onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
