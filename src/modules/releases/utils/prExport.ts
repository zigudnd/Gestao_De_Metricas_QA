// ─── CSV Export for PRs ─────────────────────────────────────────────────────

interface PRForExport {
  id: string
  pr_link: string
  repository: string
  description: string
  change_type: string
  review_status: string
  user_email?: string
  squad_name?: string
  created_at: string
  review_observation?: string | null
}

const CSV_HEADERS = [
  'ID',
  'Squad',
  'Dev',
  'Link do PR',
  'Repositorio',
  'Descricao',
  'Tipo',
  'Status',
  'Data',
  'Observacao',
]

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function exportPRsToCSV(prs: PRForExport[]): void {
  const bom = '\uFEFF'
  const header = CSV_HEADERS.map(escapeCSV).join(',')

  const dataRows = prs.map((pr) =>
    [
      pr.id,
      pr.squad_name || '',
      pr.user_email || '',
      pr.pr_link,
      pr.repository,
      pr.description,
      pr.change_type,
      pr.review_status,
      fmtDate(pr.created_at),
      pr.review_observation || '',
    ]
      .map(escapeCSV)
      .join(','),
  )

  const csv = bom + header + '\n' + dataRows.join('\n') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prs-release-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
