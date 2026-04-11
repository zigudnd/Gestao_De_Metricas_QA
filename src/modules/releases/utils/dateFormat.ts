/**
 * Formats an ISO date string (yyyy-mm-dd) as "dd/mm/yyyy".
 */
export function fmtDateFull(dateStr: string): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Formats an ISO date string (yyyy-mm-dd) as "dd/mm".
 */
export function fmtDateShort(dateStr: string): string {
  if (!dateStr) return '--'
  const parts = dateStr.split('-')
  if (parts.length < 3) return '--'
  return `${parts[2]}/${parts[1]}`
}
