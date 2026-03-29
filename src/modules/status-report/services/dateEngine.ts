import type { StatusReportItem, ComputedDates, ComputedDatesMap } from '../types/statusReport.types'

/** Adiciona N dias corridos a uma data ISO */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/** Diferença em dias entre duas datas ISO (b - a) */
export function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

/**
 * Resolve todas as datas do report usando topological sort (DFS).
 *
 * Regras:
 *   1. Se item não tem predecessores: startDate = item.startDate (manual)
 *   2. Se tem predecessores: startDate = max(endDate dos predecessores) + 1 dia
 *   3. endDate = deadlineDate se preenchido, senão startDate + durationDays - 1
 *   4. Se ciclo detectado: marcar isCycle = true, não calcular datas
 *   5. isLate = endDate < hoje && pct < 100
 */
export function computeAllDates(items: StatusReportItem[]): ComputedDatesMap {
  const map = new Map<string, StatusReportItem>()
  for (const item of items) {
    map.set(item.id, item)
  }

  const result: ComputedDatesMap = {}
  const resolved = new Map<string, ComputedDates>()
  const visiting = new Set<string>()

  const today = new Date().toISOString().split('T')[0]

  function resolve(id: string): ComputedDates {
    if (resolved.has(id)) return resolved.get(id)!

    const item = map.get(id)
    if (!item) {
      const fallback: ComputedDates = { start: '', end: '', isCycle: false, isLate: false }
      resolved.set(id, fallback)
      return fallback
    }

    // Cycle detection
    if (visiting.has(id)) {
      const cycle: ComputedDates = { start: '', end: '', isCycle: true, isLate: false }
      resolved.set(id, cycle)
      return cycle
    }

    visiting.add(id)

    // Resolve predecessors
    const validDeps = item.dependsOn.filter((depId) => map.has(depId))
    let computedStart = item.startDate || ''

    if (validDeps.length > 0) {
      let maxEnd = ''
      let hasCycle = false

      for (const depId of validDeps) {
        const depDates = resolve(depId)
        if (depDates.isCycle) {
          hasCycle = true
          break
        }
        if (depDates.end && depDates.end > maxEnd) {
          maxEnd = depDates.end
        }
      }

      if (hasCycle) {
        visiting.delete(id)
        const cycle: ComputedDates = { start: '', end: '', isCycle: true, isLate: false }
        resolved.set(id, cycle)
        return cycle
      }

      if (maxEnd) {
        computedStart = addDays(maxEnd, 1)
      }
    }

    // Garante duração mínima de 1 dia (Risco 2)
    const safeDuration = Math.max(1, item.durationDays || 1)

    let computedEnd = ''
    if (item.deadlineDate) {
      // Valida que deadline >= start (Risco 5)
      if (computedStart && item.deadlineDate < computedStart) {
        computedEnd = addDays(computedStart, safeDuration - 1)
      } else {
        computedEnd = item.deadlineDate
      }
    } else if (computedStart) {
      computedEnd = addDays(computedStart, safeDuration - 1)
    }

    const isLate = computedEnd !== '' && computedEnd < today && item.pct < 100

    visiting.delete(id)

    const dates: ComputedDates = {
      start: computedStart,
      end: computedEnd,
      isCycle: false,
      isLate,
    }
    resolved.set(id, dates)
    return dates
  }

  for (const item of items) {
    result[item.id] = resolve(item.id)
  }

  return result
}
