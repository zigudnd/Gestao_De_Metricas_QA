// ─── TestCase ─────────────────────────────────────────────────────────────────

export type TestCaseStatus = 'Pendente' | 'Concluído' | 'Falhou' | 'Bloqueado'
export type TestCaseComplexity = 'Baixa' | 'Moderada' | 'Alta'

export interface TestCase {
  id: number
  name: string
  complexity: TestCaseComplexity
  status: TestCaseStatus
  executionDay: string   // 'D1', 'D2', ... ou ''
  gherkin: string
}

// ─── Feature ──────────────────────────────────────────────────────────────────

export type FeatureStatus = 'Ativa' | 'Bloqueada' | 'Cancelada'

export interface Feature {
  id: number
  suiteId: number
  name: string
  tests: number          // calculado: cases.length + manualTests
  manualTests: number
  exec: number           // calculado: sum(execution)
  execution: Record<string, number>      // { D1: 3, D2: 2, ... }
  manualExecData: Record<string, number> // input manual do usuário
  gherkinExecs: Record<string, number>   // calculado dos cases
  mockupImage: string    // base64 data URL
  status: FeatureStatus
  blockReason: string
  activeFilter: TestCaseStatus | 'Todos'
  cases: TestCase[]
}

// ─── Suite ────────────────────────────────────────────────────────────────────

export interface Suite {
  id: number
  name: string
}

// ─── Bug ──────────────────────────────────────────────────────────────────────

export type BugStatus = 'Aberto' | 'Em Andamento' | 'Resolvido'
export type BugSeverity = 'Crítica' | 'Alta' | 'Média' | 'Baixa'
export type BugStack = 'Front' | 'BFF' | 'Back' | 'Mobile' | 'Infra' | string

export interface Bug {
  id: string
  desc: string
  feature: string
  stack: BugStack
  category?: string
  severity: BugSeverity
  assignee: string
  status: BugStatus
  retests: number
  openedAt?: string      // ISO date string
  resolvedAt?: string    // ISO date string
  notes?: string
}

// ─── Blocker ──────────────────────────────────────────────────────────────────

export interface Blocker {
  id: number
  date: string           // ISO date string
  reason: string
  hours: number
}

// ─── Alignment ────────────────────────────────────────────────────────────────

export interface Alignment {
  id: number
  text: string
}

// ─── Responsible ──────────────────────────────────────────────────────────────

export interface ResponsiblePerson {
  id: number
  role: string   // PO, TL, Coordenador, Gerente, etc.
  name: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface SprintConfig {
  sprintDays: number
  title: string
  startDate: string
  endDate: string
  targetVersion: string
  squad: string
  qaName: string
  excludeWeekends: boolean
  // Health Score weights
  hsCritical: number
  hsHigh: number
  hsMedium: number
  hsLow: number
  hsRetest: number
  hsBlocked: number
  hsDelayed: number
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export interface Notes {
  premises: string
  actionPlan: string
}

// ─── SprintState ──────────────────────────────────────────────────────────────

export interface SprintState {
  config: SprintConfig
  currentDate: string
  reports: Record<string, string>   // { '2024-01-15': 'report text' }
  notes: Notes
  alignments: Alignment[]
  suites: Suite[]
  features: Feature[]
  blockers: Blocker[]
  bugs: Bug[]
  responsibles: ResponsiblePerson[]
}

// ─── Master Index ─────────────────────────────────────────────────────────────

export interface SprintIndexEntry {
  id: string
  title: string
  squad: string
  startDate: string
  endDate: string
  totalTests: number
  totalExec: number
  updatedAt: string
  favorite?: boolean
}
