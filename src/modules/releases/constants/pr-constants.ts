// ─── PR Constants (single source of truth) ──────────────────────────────────

export const REVIEW_STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'var(--color-amber)', bg: 'var(--color-amber-light)' },
  approved: { label: 'Aprovado', color: 'var(--color-green)', bg: 'var(--color-green-light)' },
  rejected: { label: 'Rejeitado', color: 'var(--color-red)', bg: 'var(--color-red-light)' },
} as const

export const CHANGE_TYPE_CONFIG = {
  feature: { label: 'Feature', color: 'var(--color-blue)' },
  fix: { label: 'Fix', color: 'var(--color-red)' },
  refactor: { label: 'Refactor', color: '#8b5cf6' },
  hotfix: { label: 'Hotfix', color: '#f97316' },
} as const

/** Badge border-radius padrao (pill shape) */
export const BADGE_RADIUS = 12
