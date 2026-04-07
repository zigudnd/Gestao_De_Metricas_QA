import type { SprintState, SprintIndexEntry, SprintConfig, Feature, Notes } from '../types/sprint.types'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/auditService'
import { showToast } from '@/app/components/Toast'
import { uid } from '@/lib/uid'

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEY = (id: string) => `qaDashboardData_${id}`
export const MASTER_KEY = 'qaDashboardMasterIndex'

// ─── Default State ────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: SprintConfig = {
  sprintDays: 20,
  title: 'ToStatos - Acompanhamento da Sprint',
  startDate: '',
  endDate: '',
  targetVersion: '',
  squad: '',
  qaName: '',
  excludeWeekends: true,
  hsCritical: 15,
  hsHigh: 10,
  hsMedium: 5,
  hsLow: 2,
  hsRetest: 2,
  hsBlocked: 10,
  hsDelayed: 2,
  psCritical: 10,
  psHigh: 5,
  psMedium: 3,
  psLow: 1,
}

export const DEFAULT_NOTES: Notes = {
  premises: '',
  actionPlan: '',
  operationalNotes: '',
}

export const DEFAULT_STATE: SprintState = {
  config: { ...DEFAULT_CONFIG },
  currentDate: new Date().toISOString().split('T')[0],
  reports: {},
  notes: { ...DEFAULT_NOTES },
  alignments: [],
  suites: [{ id: 1, name: 'Suite Principal' }],
  features: [
    {
      id: 1,
      suiteId: 1,
      name: 'Apresentação',
      tests: 1,
      manualTests: 0,
      exec: 1,
      execution: {},
      manualExecData: { D1: 1 },
      gherkinExecs: {},
      mockupImage: '',
      status: 'Ativa',
      blockReason: '',
      activeFilter: 'Todos',
      cases: [
        {
          id: 101,
          name: 'Validar UI Inicial',
          complexity: 'Baixa',
          status: 'Pendente',
          executionDay: '',
          gherkin: '',
        },
      ],
    },
  ],
  blockers: [],
  bugs: [],
  responsibles: [],
}

// ─── normalizeState — port fiel do model.js ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeState(rawState: any): SprintState {
  const s: SprintState = rawState
    ? structuredClone(rawState)
    : structuredClone(DEFAULT_STATE)

  if (!s.config) s.config = structuredClone(DEFAULT_CONFIG)

  // ── Migração: dados antigos sem suites ──────────────────────────────────────
  if (!Array.isArray(s.suites) || s.suites.length === 0) {
    const defaultSuiteId = uid()
    s.suites = [{ id: defaultSuiteId, name: 'Suite Principal' }]
    if (Array.isArray(s.features)) {
      s.features.forEach((f) => { f.suiteId = defaultSuiteId })
    }
  }

  if (s.config.squad === undefined) s.config.squad = ''
  if (s.config.qaName === undefined) s.config.qaName = ''
  if (s.config.excludeWeekends === undefined) s.config.excludeWeekends = true
  if (s.config.hsCritical === undefined) s.config.hsCritical = 15
  if (s.config.hsHigh === undefined) s.config.hsHigh = 10
  if (s.config.hsMedium === undefined) s.config.hsMedium = 5
  if (s.config.hsLow === undefined) s.config.hsLow = 2
  if (s.config.hsRetest === undefined) s.config.hsRetest = 2
  if (s.config.hsBlocked === undefined) s.config.hsBlocked = 10
  if (s.config.hsDelayed === undefined) s.config.hsDelayed = 2
  if (s.config.psCritical === undefined) s.config.psCritical = 10
  if (s.config.psHigh === undefined) s.config.psHigh = 5
  if (s.config.psMedium === undefined) s.config.psMedium = 3
  if (s.config.psLow === undefined) s.config.psLow = 1

  if (!s.notes) s.notes = { ...DEFAULT_NOTES }
  if (s.notes.operationalNotes === undefined) s.notes.operationalNotes = ''
  if (!s.reports || typeof s.reports !== 'object') s.reports = {}
  if (!Array.isArray(s.alignments)) s.alignments = []
  if (!Array.isArray(s.features)) s.features = structuredClone(DEFAULT_STATE.features)
  if (!Array.isArray(s.blockers)) s.blockers = []
  if (!Array.isArray(s.bugs)) s.bugs = []
  if (!Array.isArray(s.responsibles)) s.responsibles = []
  if (!s.currentDate) s.currentDate = new Date().toISOString().split('T')[0]
  if (s.reports[s.currentDate] === undefined) s.reports[s.currentDate] = ''

  s.bugs.forEach((b) => {
    if (b.feature === undefined) b.feature = ''
    if (b.assignee === undefined) b.assignee = ''
    if (b.retests === undefined) b.retests = 0
  })

  // ── Garantir suiteId em todas as features ──────────────────────────────────
  const firstSuiteId = s.suites[0]?.id ?? 1
  s.features.forEach((f: Feature) => {
    if (!f.suiteId) f.suiteId = firstSuiteId
    if (f.exec === undefined) f.exec = 0
    if (f.manualTests === undefined) f.manualTests = 0
    if (f.status === undefined || (f.status as string) === 'Concluída') f.status = 'Ativa'
    if (f.blockReason === undefined) f.blockReason = ''
    if (f.activeFilter === undefined) f.activeFilter = 'Todos'
    if (f.mockupImage === undefined) f.mockupImage = ''
    if (!Array.isArray(f.cases)) f.cases = []
    if (!f.gherkinExecs) f.gherkinExecs = {}

    f.cases.forEach((c) => {
      if (c.complexity === undefined) c.complexity = 'Baixa'
      if (c.status === undefined) c.status = 'Pendente'
      if (c.executionDay === undefined) c.executionDay = ''
    })

    if (!f.manualExecData) {
      f.manualExecData = {}
      if (f.execution) {
        Object.keys(f.execution).forEach((k) => {
          f.manualExecData[k] = f.execution[k]
        })
      } else if (f.exec > 0) {
        f.manualExecData['D1'] = f.exec
      }
    }
  })

  return s
}

// ─── Working day helpers ──────────────────────────────────────────────────────

/** Conta os dias entre startDate e endDate (inclusive), excluindo sáb/dom se pedido. */
export function countSprintDays(startDate: string, endDate: string, excludeWeekends: boolean): number {
  const start = new Date(startDate + 'T00:00:00')
  const end   = new Date(endDate   + 'T00:00:00')
  if (end < start) return 0
  if (!excludeWeekends) {
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  }
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

/**
 * Retorna a data do N-ésimo dia da sprint (1-indexado).
 * Com excludeWeekends, D1 = startDate, D2 = próximo dia útil, etc.
 */
export function sprintDayToDate(startDate: string, n: number, excludeWeekends: boolean): Date {
  const d = new Date(startDate + 'T00:00:00')
  if (!excludeWeekends) {
    d.setDate(d.getDate() + n - 1)
    return d
  }
  let count = 1
  // Se o startDate já cair no fim de semana, conta como D1 (edge case raro)
  while (count < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return d
}

/**
 * Converte uma data de calendário para o Dn da sprint.
 * Retorna null se a data não pertencer à sprint (fora do range ou for fim de semana com excludeWeekends).
 */
export function dateToSprintDayKey(
  dateStr: string, startDate: string, sprintDays: number, excludeWeekends: boolean
): string | null {
  const start  = new Date(startDate + 'T00:00:00')
  const target = new Date(dateStr   + 'T00:00:00')
  if (target < start) return null
  if (excludeWeekends && (target.getDay() === 0 || target.getDay() === 6)) return null
  if (!excludeWeekends) {
    const n = Math.round((target.getTime() - start.getTime()) / 86400000) + 1
    return n >= 1 && n <= sprintDays ? `D${n}` : null
  }
  let count = 1
  const d = new Date(start)
  while (d < target) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return count >= 1 && count <= sprintDays ? `D${count}` : null
}

// ─── computeFields — equivalente ao saveState() do model.js ──────────────────

export function computeFields(state: SprintState): SprintState {
  const excludeWeekends = state.config.excludeWeekends ?? true
  let sprintDays: number
  if (state.config.startDate && state.config.endDate) {
    const days = countSprintDays(state.config.startDate, state.config.endDate, excludeWeekends)
    sprintDays = days > 0 ? days : (state.config.sprintDays || 20)
  } else {
    sprintDays = state.config.sprintDays || 20
  }

  const features = state.features.map((f) => {
    const manual = Math.max(0, parseInt(String(f.manualTests)) || 0)
    const tests = (f.cases?.length ?? 0) + manual

    const gherkinExecs: Record<string, number> = {}
    ;(f.cases ?? []).forEach((c) => {
      if ((c.status === 'Concluído' || c.status === 'Falhou') && c.executionDay) {
        gherkinExecs[c.executionDay] = (gherkinExecs[c.executionDay] || 0) + 1
      }
    })

    const manualExecData = f.manualExecData ?? {}
    const execution: Record<string, number> = {}
    let sumExec = 0
    for (let i = 1; i <= sprintDays; i++) {
      const dKey = `D${i}`
      const m = parseInt(String(manualExecData[dKey])) || 0
      const g = gherkinExecs[dKey] || 0
      const total = m + g
      if (total > 0) execution[dKey] = total
      sumExec += total
    }

    const exec = Math.min(sumExec, tests)

    return { ...f, manualTests: manual, tests, gherkinExecs, execution, exec }
  })

  return { ...state, features, config: { ...state.config, sprintDays } }
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

export function loadFromStorage(sprintId: string): SprintState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sprintId))
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Sprints] Failed to load from localStorage:', e)
    return null
  }
}

export function saveToStorage(sprintId: string, state: SprintState): void {
  try {
    localStorage.setItem(STORAGE_KEY(sprintId), JSON.stringify(state))
  } catch (e) {
    if (import.meta.env.DEV) console.error('Erro ao salvar no localStorage:', e)
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      showToast('Armazenamento local cheio. Seus dados podem não ter sido salvos.', 'error')
    }
  }
}

// ─── Master Index helpers ─────────────────────────────────────────────────────

export function getMasterIndex(): SprintIndexEntry[] {
  try {
    const raw = localStorage.getItem(MASTER_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Sprints] Failed to load master index:', e)
    return []
  }
}

export function saveMasterIndex(index: SprintIndexEntry[]): void {
  try {
    localStorage.setItem(MASTER_KEY, JSON.stringify(index))
  } catch (e) {
    if (import.meta.env.DEV) console.error('Erro ao salvar Master Index:', e)
  }
}

export function upsertSprintInMasterIndex(
  sprintId: string,
  state: SprintState,
  squadId?: string,
  extras?: { sprintType?: SprintIndexEntry['sprintType']; releaseId?: string; releaseVersion?: string },
): void {
  const index = getMasterIndex()
  const totalTests = state.features.reduce((a, f) => a + (f.tests || 0), 0)
  const totalExec = state.features.reduce((a, f) => a + (f.exec || 0), 0)

  const existing = index.find((s) => s.id === sprintId)
  const entry: SprintIndexEntry = {
    id: sprintId,
    title: state.config.title || 'S/ Título',
    squad: state.config.squad || '',
    squadId: squadId ?? existing?.squadId,
    sprintType: extras?.sprintType ?? existing?.sprintType ?? 'squad',
    releaseId: extras?.releaseId ?? existing?.releaseId,
    releaseVersion: extras?.releaseVersion ?? existing?.releaseVersion,
    startDate: state.config.startDate || '',
    endDate: state.config.endDate || '',
    totalTests,
    totalExec,
    updatedAt: new Date().toISOString(),
  }

  const idx = index.findIndex((s) => s.id === sprintId)
  if (idx >= 0) {
    index[idx] = { ...index[idx], ...entry }
  } else {
    index.unshift(entry)
  }
  saveMasterIndex(index)
}

export function toggleFavoriteSprint(sprintId: string): void {
  const index = getMasterIndex()
  const idx = index.findIndex((s) => s.id === sprintId)
  if (idx === -1) return
  index[idx] = { ...index[idx], favorite: !index[idx].favorite }
  saveMasterIndex(index)
}

// ─── Supabase persistence ─────────────────────────────────────────────────────

/**
 * Carrega uma sprint do Supabase. Usado por SprintDashboard antes do fallback local.
 */
export async function loadFromServer(sprintId: string): Promise<SprintState | null> {
  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('data')
      .eq('id', sprintId)
      .single()
    if (error || !data) return null
    return normalizeState(data.data)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Sprints] Failed to load from server:', e)
    return null
  }
}

/**
 * Salva uma sprint no Supabase (upsert). Chamado pelo sprintStore a cada _commit.
 */
export async function persistToServer(sprintId: string, state: SprintState, updatedAt?: string): Promise<void> {
  const entry = getMasterIndex().find((s) => s.id === sprintId)
  const status = entry?.status ?? 'ativa'
  const squad_id = entry?.squadId ?? null
  const { error } = await supabase.from('sprints').upsert({
    id: sprintId,
    data: state,
    status,
    squad_id,
    updated_at: updatedAt ?? new Date().toISOString(),
  })
  if (error) {
    if (import.meta.env.DEV) console.error('[Sprints] persistToServer failed:', error.message)
    throw error
  }
}

const LAST_SYNC_KEY = 'qaDashboardLastSync'

/**
 * Incremental sync: fetches only sprints updated since the last sync timestamp.
 * On first load (no timestamp), does a full sync for backward compatibility.
 */
export async function syncAllFromSupabase(): Promise<void> {
  try {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '1970-01-01T00:00:00Z'
    const now = new Date().toISOString()

    const PAGE_SIZE = 100
    const localIndex = getMasterIndex()
    let offset = 0
    let totalSynced = 0

    while (true) {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, data, status, squad_id, updated_at')
        .gt('updated_at', lastSync)
        .order('updated_at', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        const state = normalizeState(row.data)
        const computed = computeFields(state)
        saveToStorage(row.id, computed)

        // Update index entry — extract sprintType/releaseId from sprint data JSON
        const existing = localIndex.find((s) => s.id === row.id)
        const rawData = row.data as Record<string, unknown> | null
        const remoteSprintType = (rawData?.sprintType as SprintIndexEntry['sprintType']) ?? undefined
        const remoteReleaseId = (rawData?.releaseId as string) ?? undefined
        const remoteReleaseVersion = (rawData?.releaseVersion as string) ?? undefined
        const entry: SprintIndexEntry = {
          id: row.id,
          title: state.config.title || 'S/ Título',
          squad: state.config.squad || '',
          squadId: row.squad_id ?? existing?.squadId,
          sprintType: remoteSprintType ?? existing?.sprintType,
          releaseId: remoteReleaseId ?? existing?.releaseId,
          releaseVersion: remoteReleaseVersion ?? existing?.releaseVersion,
          startDate: state.config.startDate || '',
          endDate: state.config.endDate || '',
          totalTests: computed.features.reduce((a, f) => a + (f.tests || 0), 0),
          totalExec: computed.features.reduce((a, f) => a + (f.exec || 0), 0),
          updatedAt: row.updated_at,
          favorite: existing?.favorite ?? false,
          status: row.status as SprintIndexEntry['status'],
        }

        const idx = localIndex.findIndex((s) => s.id === row.id)
        if (idx >= 0) localIndex[idx] = { ...localIndex[idx], ...entry }
        else localIndex.unshift(entry)
      }

      totalSynced += data.length
      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    saveMasterIndex(localIndex)
    localStorage.setItem(LAST_SYNC_KEY, now)

    if (import.meta.env.DEV) console.log(`[Sync] ${totalSynced} sprint(s) sincronizada(s)`)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Supabase] syncAllFromSupabase falhou:', e)
  }
}

/**
 * Remove uma sprint do Supabase. Fire-and-forget.
 */
export async function deleteSprintFromSupabase(sprintId: string): Promise<void> {
  const { error } = await supabase.from('sprints').delete().eq('id', sprintId)
  if (error) {
    if (import.meta.env.DEV) console.error('[Sprints] deleteSprintFromSupabase failed:', error.message)
    throw error
  }
}

export async function concludeSprint(sprintId: string): Promise<void> {
  const index = getMasterIndex()
  const idx = index.findIndex((s) => s.id === sprintId)
  if (idx === -1) return
  const previousEntry = { ...index[idx] }
  index[idx] = { ...index[idx], status: 'concluida' }
  saveMasterIndex(index)
  logAudit('sprint', sprintId, 'update', { status: { old: 'ativa', new: 'concluida' } })
  const { error } = await supabase.from('sprints').update({ status: 'concluida' }).eq('id', sprintId)
  if (error) {
    // Revert local state on server failure
    const rollbackIndex = getMasterIndex()
    const rollbackIdx = rollbackIndex.findIndex((s) => s.id === sprintId)
    if (rollbackIdx >= 0) {
      rollbackIndex[rollbackIdx] = previousEntry
      saveMasterIndex(rollbackIndex)
    }
    if (import.meta.env.DEV) console.error('[Sprints] concludeSprint server update failed:', error.message)
    throw error
  }
}

export async function reactivateSprint(sprintId: string): Promise<void> {
  const index = getMasterIndex()
  const idx = index.findIndex((s) => s.id === sprintId)
  if (idx === -1) return
  const previousEntry = { ...index[idx] }
  index[idx] = { ...index[idx], status: 'ativa' }
  saveMasterIndex(index)
  logAudit('sprint', sprintId, 'update', { status: { old: 'concluida', new: 'ativa' } })
  const { error } = await supabase.from('sprints').update({ status: 'ativa' }).eq('id', sprintId)
  if (error) {
    // Revert local state on server failure
    const rollbackIndex = getMasterIndex()
    const rollbackIdx = rollbackIndex.findIndex((s) => s.id === sprintId)
    if (rollbackIdx >= 0) {
      rollbackIndex[rollbackIdx] = previousEntry
      saveMasterIndex(rollbackIndex)
    }
    if (import.meta.env.DEV) console.error('[Sprints] reactivateSprint server update failed:', error.message)
    throw error
  }
}
