// ─── PR Change & Review Types ─────────────────────────────────────────────

export type ChangeType = 'feature' | 'fix' | 'refactor' | 'hotfix'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

// ─── Core Entities ────────────────────────────────────────────────────────

export interface ReleasePR {
  id: string
  release_id: string
  squad_id: string | null
  user_id: string
  user_email?: string
  squad_name?: string
  pr_link: string
  repository: string
  description: string
  change_type: ChangeType
  review_status: ReviewStatus
  reviewed_by: string | null
  reviewed_by_email?: string | null
  reviewed_at: string | null
  review_observation: string | null
  test_commitment_date: string | null
  created_at: string
  updated_at: string
}

// ─── Filters & Summaries ──────────────────────────────────────────────────

export interface PRFilters {
  squad_id?: string
  review_status?: ReviewStatus
  change_type?: ChangeType
}

export interface SquadPRSummary {
  squad_id: string
  squad_name: string
  total_prs: number
  approved: number
  pending: number
  rejected: number
  has_tests: boolean
}
