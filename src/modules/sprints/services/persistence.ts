import type { SprintState, SprintIndexEntry, SprintConfig, Feature, Notes } from '../types/sprint.types'

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
  hsCritical: 15,
  hsHigh: 10,
  hsMedium: 5,
  hsLow: 2,
  hsRetest: 2,
  hsBlocked: 10,
  hsDelayed: 2,
}

export const DEFAULT_NOTES: Notes = {
  premises: '',
  actionPlan: '',
  operationalPremises: '',
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
  if (s.config.hsCritical === undefined) s.config.hsCritical = 15
  if (s.config.hsHigh === undefined) s.config.hsHigh = 10
  if (s.config.hsMedium === undefined) s.config.hsMedium = 5
  if (s.config.hsLow === undefined) s.config.hsLow = 2
  if (s.config.hsRetest === undefined) s.config.hsRetest = 2
  if (s.config.hsBlocked === undefined) s.config.hsBlocked = 10
  if (s.config.hsDelayed === undefined) s.config.hsDelayed = 2

  if (!s.notes) s.notes = { ...DEFAULT_NOTES }
  if (s.notes.operationalPremises === undefined) s.notes.operationalPremises = ''
  if (!s.reports || typeof s.reports !== 'object') s.reports = {}
  if (!Array.isArray(s.alignments)) s.alignments = []
  if (!Array.isArray(s.features)) s.features = JSON.parse(JSON.stringify(DEFAULT_STATE.features))
  if (!Array.isArray(s.blockers)) s.blockers = []
  if (!Array.isArray(s.bugs)) s.bugs = []
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

// ─── computeFields — equivalente ao saveState() do model.js ──────────────────

export function computeFields(state: SprintState): SprintState {
  let sprintDays: number
  if (state.config.startDate && state.config.endDate) {
    const s = new Date(state.config.startDate + 'T00:00:00')
    const e = new Date(state.config.endDate + 'T00:00:00')
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    sprintDays = diff > 0 ? diff : (state.config.sprintDays || 20)
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

export function upsertSprintInMasterIndex(sprintId: string, state: SprintState): void {
  const index = getMasterIndex()
  const totalTests = state.features.reduce((a, f) => a + (f.tests || 0), 0)
  const totalExec = state.features.reduce((a, f) => a + (f.exec || 0), 0)

  const entry: SprintIndexEntry = {
    id: sprintId,
    title: state.config.title || 'S/ Título',
    squad: state.config.squad || '',
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

// ─── Remote persistence ───────────────────────────────────────────────────────

export async function loadFromServer(sprintId: string): Promise<SprintState | null> {
  try {
    const res = await fetch(`/api/dashboard/${sprintId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.payload ?? null
  } catch {
    return null
  }
}

export async function persistToServer(sprintId: string, state: SprintState): Promise<void> {
  await fetch(`/api/dashboard/${sprintId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: state }),
  })
}
