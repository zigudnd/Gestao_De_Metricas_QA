import { supabase } from '@/lib/supabase'
import type { ReleasePR, PRFilters, ReviewStatus, SquadPRSummary } from '../types/pr.types'

// ─── Helpers ──────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  }
}

function parseResponse<T>(text: string, res: Response, fallbackMsg: string): T {
  let json: Record<string, unknown>
  try { json = JSON.parse(text) } catch { throw new Error('Resposta inválida do servidor') }
  if (!res.ok) {
    const errMsg = json.error && typeof json.error === 'object'
      ? (json.error as { message?: string }).message ?? fallbackMsg
      : (json.error as string) || fallbackMsg
    throw new Error(errMsg)
  }
  return json.data as T
}

// ─── PR CRUD ──────────────────────────────────────────────────────────────

export async function listPRs(releaseId: string, filters?: PRFilters): Promise<ReleasePR[]> {
  const params = new URLSearchParams()
  if (filters?.squad_id) params.set('squad_id', filters.squad_id)
  if (filters?.review_status) params.set('review_status', filters.review_status)
  if (filters?.change_type) params.set('change_type', filters.change_type)

  const qs = params.toString()
  const url = `/api/v1/releases/${releaseId}/prs${qs ? `?${qs}` : ''}`

  const res = await fetch(url, { headers: await authHeaders() })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor. Gestão de PRs requer modo colaborativo.')
  const text = await res.text()
  return parseResponse<ReleasePR[]>(text, res, 'Erro ao listar PRs da release')
}

export async function createPR(
  releaseId: string,
  data: {
    pr_link: string
    repository: string
    description: string
    change_type: string
    squad_id?: string | null
  },
): Promise<ReleasePR> {
  const res = await fetch(`/api/v1/releases/${releaseId}/prs`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  const text = await res.text()
  return parseResponse<ReleasePR>(text, res, 'Erro ao cadastrar PR')
}

export async function updatePR(
  releaseId: string,
  prId: string,
  data: Partial<ReleasePR>,
): Promise<ReleasePR> {
  const res = await fetch(`/api/v1/releases/${releaseId}/prs/${prId}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  const text = await res.text()
  return parseResponse<ReleasePR>(text, res, 'Erro ao atualizar PR')
}

export async function deletePR(releaseId: string, prId: string): Promise<void> {
  const res = await fetch(`/api/v1/releases/${releaseId}/prs/${prId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  if (!res.ok) {
    const text = await res.text()
    let msg = 'Erro ao excluir PR'
    try {
      const json = JSON.parse(text)
      const err = json.error
      msg = (err && typeof err === 'object' ? (err as { message?: string }).message : err as string) || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
}

// ─── Review ───────────────────────────────────────────────────────────────

export async function reviewPR(
  releaseId: string,
  prId: string,
  data: { status: ReviewStatus; review_observation?: string },
): Promise<ReleasePR> {
  const res = await fetch(`/api/v1/releases/${releaseId}/prs/${prId}/review`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  const text = await res.text()
  return parseResponse<ReleasePR>(text, res, 'Erro ao registrar revisão do PR')
}

// ─── Summary ──────────────────────────────────────────────────────────────

export async function getSquadsSummary(releaseId: string): Promise<SquadPRSummary[]> {
  const res = await fetch(`/api/v1/releases/${releaseId}/squads-summary`, {
    headers: await authHeaders(),
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  const text = await res.text()
  return parseResponse<SquadPRSummary[]>(text, res, 'Erro ao carregar resumo de PRs por squad')
}

// ─── CSV Export (client-side) ─────────────────────────────────────────────

export function exportPRsCSV(prs: ReleasePR[]): void {
  const header = [
    'ID', 'Squad', 'Repositório', 'Link PR', 'Descrição',
    'Tipo', 'Status Revisão', 'Revisado Por', 'Data Revisão',
    'Observação', 'Data Compromisso Teste', 'Criado Em',
  ].join(',')

  const escapeCSV = (val: string | null | undefined): string => {
    if (val == null) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = prs.map((pr) =>
    [
      pr.id,
      escapeCSV(pr.squad_name),
      escapeCSV(pr.repository),
      escapeCSV(pr.pr_link),
      escapeCSV(pr.description),
      pr.change_type,
      pr.review_status,
      escapeCSV(pr.reviewed_by),
      pr.reviewed_at ?? '',
      escapeCSV(pr.review_observation),
      pr.test_commitment_date ?? '',
      pr.created_at,
    ].join(','),
  )

  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prs-release-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
