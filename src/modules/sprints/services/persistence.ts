import type { SprintState, SprintIndexEntry, SprintConfig, Feature, Notes } from '../types/sprint.types'
import { supabase } from '@/lib/supabase'

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
    ? JSON.parse(JSON.stringify(rawState))
    : JSON.parse(JSON.stringify(DEFAULT_STATE))

  if (!s.config) s.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

  // ── Migração: dados antigos sem suites ──────────────────────────────────────
  if (!Array.isArray(s.suites) || s.suites.length === 0) {
    const defaultSuiteId = Date.now()
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
  if (!Array.isArray(s.features)) s.features = JSON.parse(JSON.stringify(DEFAULT_STATE.features))
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
  } catch {
    return null
  }
}

export function saveToStorage(sprintId: string, state: SprintState): void {
  try {
    localStorage.setItem(STORAGE_KEY(sprintId), JSON.stringify(state))
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e)
  }
}

// ─── Master Index helpers ─────────────────────────────────────────────────────

export function getMasterIndex(): SprintIndexEntry[] {
  try {
    const raw = localStorage.getItem(MASTER_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMasterIndex(index: SprintIndexEntry[]): void {
  try {
    localStorage.setItem(MASTER_KEY, JSON.stringify(index))
  } catch (e) {
    console.error('Erro ao salvar Master Index:', e)
  }
}

export function upsertSprintInMasterIndex(
  sprintId: string,
  state: SprintState,
  squadId?: string,
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
  } catch {
    return null
  }
}

/**
 * Salva uma sprint no Supabase (upsert). Chamado pelo sprintStore a cada _commit.
 */
export async function persistToServer(sprintId: string, state: SprintState): Promise<void> {
  const entry = getMasterIndex().find((s) => s.id === sprintId)
  const status = entry?.status ?? 'ativa'
  const squad_id = entry?.squadId ?? null
  await supabase.from('sprints').upsert({
    id: sprintId,
    data: state,
    status,
    squad_id,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Ao iniciar o app, puxa todas as sprints do Supabase e popula o localStorage.
 * Garante que qualquer usuário veja as sprints criadas por outras pessoas.
 */
export async function syncAllFromSupabase(): Promise<void> {
  try {
    const PAGE_SIZE = 100
    const remoteIndex: SprintIndexEntry[] = []
    let offset = 0

    // Paginação para evitar estouro de memória em projetos grandes
    while (true) {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, data, status, squad_id, updated_at')
        .range(offset, offset + PAGE_SIZE - 1)
      if (error || !data || data.length === 0) break

      for (const row of data) {
        const state = normalizeState(row.data)
        saveToStorage(row.id, state)
        const totalTests = state.features.reduce((a: number, f: { tests?: number }) => a + (f.tests || 0), 0)
        const totalExec = state.features.reduce((a: number, f: { exec?: number }) => a + (f.exec || 0), 0)
        remoteIndex.push({
          id: row.id,
          title: state.config.title || 'S/ Título',
          squad: state.config.squad || '',
          squadId: row.squad_id ?? undefined,
          startDate: state.config.startDate || '',
          endDate: state.config.endDate || '',
          totalTests,
          totalExec,
          updatedAt: row.updated_at,
          status: row.status as 'ativa' | 'concluida',
        })
      }

      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    if (remoteIndex.length === 0) return

    // Preserva flags locais (favorito, ordem manual) e mescla com os dados remotos
    const localIndex = getMasterIndex()
    const merged = remoteIndex.map((remote) => {
      const local = localIndex.find((l) => l.id === remote.id)
      return { ...remote, favorite: local?.favorite }
    })
    saveMasterIndex(merged)
  } catch (e) {
    console.warn('[Supabase] syncAllFromSupabase falhou — usando dados locais.', e)
  }
}

/**
 * Remove uma sprint do Supabase. Fire-and-forget.
 */
export async function deleteSprintFromSupabase(sprintId: string): Promise<void> {
  await supabase.from('sprints').delete().eq('id', sprintId)
}

export function concludeSprint(sprintId: string): void {
  const index = getMasterIndex()
  const idx = index.findIndex((s) => s.id === sprintId)
  if (idx === -1) return
  index[idx] = { ...index[idx], status: 'concluida' }
  saveMasterIndex(index)
  supabase.from('sprints').update({ status: 'concluida' }).eq('id', sprintId)
}

export function reactivateSprint(sprintId: string): void {
  const index = getMasterIndex()
  const idx = index.findIndex((s) => s.id === sprintId)
  if (idx === -1) return
  index[idx] = { ...index[idx], status: 'ativa' }
  saveMasterIndex(index)
  supabase.from('sprints').update({ status: 'ativa' }).eq('id', sprintId)
}
