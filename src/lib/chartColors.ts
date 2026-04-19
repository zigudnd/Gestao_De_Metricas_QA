/**
 * Chart.js color palette — centralized for future dark mode support.
 * Canvas elements cannot use CSS variables, so we maintain a JS-side palette.
 * When dark mode is implemented, this file switches colors based on theme.
 */

// ─── Semantic colors ────────────────────────────────────────────────────────

const CHART_COLORS = {
  // Status
  green: '#639922',
  greenLight: '#eaf3de',
  greenDark: '#3b6d11',
  red: '#e24b4a',
  redLight: '#fcebeb',
  redDark: '#a32d2d',
  amber: '#ba7517',
  amberLight: '#faeeda',
  amberDark: '#854f0b',
  yellow: '#b45309',
  yellowLight: '#fef3c7',
  blue: '#185fa5',
  blueLight: '#e6f1fb',
  blueDark: '#0c447c',
  cyan: '#06b6d4',
  purple: '#8b5cf6',

  // Neutral
  text: '#1a1a18',
  textMuted: '#6b6a65',
  textLight: '#a09f99',
  surface: '#ffffff',
  bg: '#f7f6f2',
  border: 'rgba(0, 0, 0, 0.08)',
  borderMd: 'rgba(0, 0, 0, 0.14)',
} as const

// ─── Chart palette (for multi-series) ──────────────────────────────────────

export const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
] as const

export const PALETTE_BG = PALETTE.map((c) => c + '33')

// ─── Semantic helpers ───────────────────────────────────────────────────────

export function colorHealth(v: number): string {
  return v >= 80 ? CHART_COLORS.green : v >= 60 ? CHART_COLORS.amber : CHART_COLORS.red
}

export function colorExec(v: number): string {
  return v >= 80 ? CHART_COLORS.green : v >= 50 ? CHART_COLORS.amber : CHART_COLORS.red
}

export function colorCapacidade(v: number): string {
  return v >= 90 ? CHART_COLORS.green : v >= 70 ? CHART_COLORS.amber : CHART_COLORS.red
}

export function colorInverted(v: number): string {
  return v === 0 ? CHART_COLORS.green : v <= 3 ? CHART_COLORS.amber : CHART_COLORS.red
}

export function colorMttr(v: number): string {
  return v === 0 ? CHART_COLORS.green : v <= 24 ? CHART_COLORS.amber : CHART_COLORS.red
}

export function colorRetest(v: number): string {
  return v === 0 ? CHART_COLORS.green : v <= 20 ? CHART_COLORS.amber : CHART_COLORS.red
}

export function colorBlocked(v: number): string {
  return v === 0 ? CHART_COLORS.green : v <= 8 ? CHART_COLORS.amber : CHART_COLORS.red
}
