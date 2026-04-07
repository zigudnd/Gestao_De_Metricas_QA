import type { Suite, Feature, TestCase, Bug, Blocker } from '@/modules/sprints/types/sprint.types'

// ─── Re-exports for convenience ─────────────────────────────────────────────

export type { Suite, Feature, TestCase, Bug, Blocker }

// ─── Release Status ─────────────────────────────────────────────────────────

export type ReleaseStatus =
  | 'planejada'
  | 'em_desenvolvimento'
  | 'corte'
  | 'em_homologacao'
  | 'em_regressivo'
  | 'em_qa'
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'em_producao'
  | 'concluida'
  | 'uniu_escopo'
  | 'rollback'
  | 'cancelada'

export type ReleaseSquadStatus =
  | 'not_started'
  | 'testing'
  | 'em_regressivo'
  | 'blocked'
  | 'approved'
  | 'rejected'

// ─── Core Entities ──────────────────────────────────────────────────────────

export interface Release {
  id: string
  version: string
  title: string
  description: string
  status: ReleaseStatus
  productionDate: string          // ISO date string
  cutoffDate: string              // ISO date string
  buildDate: string               // ISO date string — Gerar Versão
  homologacaoStart: string        // ISO date string
  homologacaoEnd: string          // ISO date string
  betaDate: string                // ISO date string — Beta/Pré-Prod
  squads: ReleaseSquad[]
  checkpoints: Checkpoint[]
  statusHistory: StatusChange[]
  platforms: string[]              // ex: ['iOS', 'Android']
  nonBlockingFeatures: string[]   // feature names not blocking release
  rolloutPct: number              // % distribuição em produção (0-100)
  createdAt: string               // ISO datetime
  updatedAt: string               // ISO datetime
}

export interface ReleaseSquad {
  id: string
  squadId: string                 // ref to squads table
  squadName: string
  status: ReleaseSquadStatus
  suites: Suite[]
  features: Feature[]
  bugs: Bug[]
  blockers: Blocker[]
  notes: string
  hasNewFeatures: boolean
}

export interface Checkpoint {
  id: string
  label: string
  date: string                    // ISO date string
  snapshots: CheckpointSnapshot[]
  createdAt: string
}

export interface CheckpointSnapshot {
  squadId: string
  squadName: string
  status: ReleaseSquadStatus
  totals: SnapshotTotals
}

export interface SnapshotTotals {
  totalTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  blockedTests: number
  openBugs: number
  resolvedBugs: number
  blockers: number
}

export interface StatusChange {
  from: ReleaseStatus
  to: ReleaseStatus
  timestamp: string               // ISO datetime
  reason: string
}

// ─── Calendar Slots (programação oficial de releases) ─────────────────────

export interface CalendarSlot {
  id: string
  version: string               // "v4.2.0"
  label: string                 // "Release App Março"
  cutoffDate: string            // ISO date
  homologacaoStart: string      // ISO date
  homologacaoEnd: string        // ISO date
  productionDate: string        // ISO date
  releaseId?: string            // ref a release criada a partir deste slot (undefined = planejado)
  createdAt: string
}

// ─── Index & Metrics ────────────────────────────────────────────────────────

export interface ReleaseIndexEntry {
  id: string
  version: string
  title: string
  status: ReleaseStatus
  productionDate: string
  squadCount: number
  updatedAt: string
  favorite?: boolean
}

export interface ReleaseMetrics {
  totalSquads: number
  totalTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  blockedTests: number
  openBugs: number
  resolvedBugs: number
  blockers: number
  coveragePct: number             // executedTests / totalTests * 100
  passPct: number                 // passedTests / totalTests * 100
  squadStatuses: Record<ReleaseSquadStatus, number>
}

export interface SquadMetrics {
  totalTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  blockedTests: number
  openBugs: number
  resolvedBugs: number
  blockers: number
  coveragePct: number
  passPct: number
}
