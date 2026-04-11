import type { ReleaseStatus } from '../types/release.types'

// ─── Status Labels ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ReleaseStatus, string> = {
  planejada: 'Planejada',
  em_desenvolvimento: 'Em Desenvolvimento',
  corte: 'Corte',
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

// ─── Status Colors (foreground / text) ──────────────────────────────────────

export const STATUS_COLORS: Record<ReleaseStatus, string> = {
  planejada: 'var(--color-text-3)',
  em_desenvolvimento: 'var(--color-blue)',
  corte: '#8b5cf6',
  em_homologacao: 'var(--color-amber)',
  em_regressivo: '#f97316',
  em_qa: '#06b6d4',
  aguardando_aprovacao: '#eab308',
  aprovada: 'var(--color-green)',
  em_producao: '#06b6d4',
  concluida: 'var(--color-green)',
  uniu_escopo: '#8b5cf6',
  rollback: '#ef4444',
  cancelada: 'var(--color-text-3)',
}

// ─── Status Background Colors ───────────────────────────────────────────────

export const STATUS_BG_COLORS: Record<ReleaseStatus, string> = {
  planejada: 'var(--color-surface-2)',
  em_desenvolvimento: 'var(--color-blue-light)',
  corte: '#ede9fe',
  em_homologacao: 'var(--color-amber-light)',
  em_regressivo: '#fff7ed',
  em_qa: '#ecfeff',
  aguardando_aprovacao: '#fefce8',
  aprovada: 'var(--color-green-light)',
  em_producao: '#ecfeff',
  concluida: 'var(--color-green-light)',
  uniu_escopo: '#ede9fe',
  rollback: '#fef2f2',
  cancelada: 'var(--color-surface-2)',
}
