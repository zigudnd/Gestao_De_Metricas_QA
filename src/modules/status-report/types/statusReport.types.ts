export type SectionId = string

export type Priority = 'high' | 'medium' | 'low'
export type Stack = 'ios' | 'android' | 'bff' | 'back'

export interface SectionDef {
  id: SectionId
  label: string
  color: string
  side: 'left' | 'right'
}

export interface StatusReportItem {
  id: string
  title: string
  section: SectionId
  priority: Priority
  stacks: Stack[]
  resp: string
  pct: number

  startDate: string
  durationDays: number
  deadlineDate: string

  dependsOn: string[]

  jira: string
  notes: string

  createdAt: string
  updatedAt: string
}

export interface StatusReportConfig {
  title: string
  date: string
  squad: string
  period: string
  periodStart: string
  periodEnd: string
}

export interface StatusReportState {
  id: string
  config: StatusReportConfig
  sections: SectionDef[]
  items: StatusReportItem[]
  createdAt: string
  updatedAt: string
}

export interface ComputedDates {
  start: string
  end: string
  isCycle: boolean
  isLate: boolean
}

export type ComputedDatesMap = Record<string, ComputedDates>

export interface StatusReportIndexEntry {
  id: string
  title: string
  squad: string
  squadId?: string
  itemCount: number
  updatedAt: string
  favorite?: boolean
  status?: 'active' | 'concluded'
  periodStart?: string
  periodEnd?: string
}

// ─── Default sections ───────────────────────────────────────────────────────

export const DEFAULT_SECTIONS: SectionDef[] = [
  { id: 'sprint',     label: 'Sprint Atual – Foco do Time',  color: '#f59e0b', side: 'left'  },
  { id: 'implanted',  label: 'Implantados / Finalizados',    color: '#10b981', side: 'right' },
  { id: 'debitos',    label: 'Débitos Técnicos',             color: '#ef4444', side: 'right' },
  { id: 'aguardando', label: 'Aguardando Produção',          color: '#06b6d4', side: 'right' },
  { id: 'teste',      label: 'Fila de Teste',                color: '#8b5cf6', side: 'right' },
  { id: 'backlog',    label: 'Backlog',                      color: '#6b7280', side: 'right' },
]

export const SECTION_COLORS = [
  '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#8b5cf6',
  '#6b7280', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48',
]
