import type { StatusReportState, StatusReportConfig, StatusReportIndexEntry } from '../types/statusReport.types'
import { DEFAULT_SECTIONS } from '../types/statusReport.types'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Storage Keys ────────────────────────────────────────────────────────────

export const STORAGE_KEY = (id: string) => `statusReport_${id}`
export const INDEX_KEY = 'statusReportMasterIndex'

// ─── Default State ───────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: StatusReportConfig = {
  title: 'Status Report',
  date: new Date().toISOString().split('T')[0],
  squad: '',
  period: '',
  periodStart: '',
  periodEnd: '',
}

export function createDefaultState(id: string): StatusReportState {
  const now = new Date().toISOString()
  return {
    id,
    config: { ...DEFAULT_CONFIG },
    sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
    items: [],
    createdAt: now,
    updatedAt: now,
  }
}

// ─── Normalize ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeState(raw: any): StatusReportState {
  const now = new Date().toISOString()
  const s: StatusReportState = raw
    ? JSON.parse(JSON.stringify(raw))
    : createDefaultState('sr_' + Date.now())

  if (!s.id) s.id = 'sr_' + Date.now()
  if (!s.config) s.config = { ...DEFAULT_CONFIG }
  if (!s.config.title) s.config.title = 'Status Report'
  if (!s.config.date) s.config.date = new Date().toISOString().split('T')[0]
  if (s.config.squad === undefined) s.config.squad = ''
  if (s.config.period === undefined) s.config.period = ''
  if (s.config.periodStart === undefined) s.config.periodStart = ''
  if (s.config.periodEnd === undefined) s.config.periodEnd = ''
  if (!Array.isArray(s.sections) || s.sections.length === 0) {
    s.sections = JSON.parse(JSON.stringify(DEFAULT_SECTIONS))
  }
  if (!Array.isArray(s.items)) s.items = []
  if (!s.createdAt) s.createdAt = now
  if (!s.updatedAt) s.updatedAt = now

  s.items.forEach((item) => {
    if (!item.id) item.id = 'sr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    if (!item.stacks) item.stacks = []
    if (!Array.isArray(item.dependsOn)) item.dependsOn = []
    if (item.pct === undefined) item.pct = 0
    if (item.durationDays === undefined) item.durationDays = 1
    if (item.startDate === undefined) item.startDate = ''
    if (item.deadlineDate === undefined) item.deadlineDate = ''
    if (item.notes === undefined) item.notes = ''
    if (item.jira === undefined) item.jira = ''
    if (item.resp === undefined) item.resp = ''
  })

  return s
}

// ─── localStorage ────────────────────────────────────────────────────────────

export function saveToLocalStorage(state: StatusReportState): void {
  try {
    localStorage.setItem(STORAGE_KEY(state.id), JSON.stringify(state))
  } catch (e) {
    console.error('[StatusReport] Erro ao salvar no localStorage:', e)
  }
}

export function loadFromLocalStorage(id: string): StatusReportState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(id))
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function deleteFromLocalStorage(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(id))
  } catch { /* ignore */ }
}

// ─── Master Index ────────────────────────────────────────────────────────────

export function getMasterIndex(): StatusReportIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveMasterIndex(index: StatusReportIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch (e) {
    console.error('[StatusReport] Erro ao salvar indice:', e)
  }
}

export function upsertMasterIndex(state: StatusReportState): void {
  const index = getMasterIndex()
  const entry: Partial<StatusReportIndexEntry> = {
    id: state.id,
    title: state.config.title || 'S/ Titulo',
    squad: state.config.squad || '',
    itemCount: state.items.length,
    updatedAt: state.updatedAt,
    periodStart: state.config.periodStart || '',
    periodEnd: state.config.periodEnd || '',
  }

  const idx = index.findIndex((e) => e.id === state.id)
  if (idx >= 0) {
    index[idx] = { ...index[idx], ...entry }
  } else {
    index.unshift({ ...entry, favorite: false, status: 'active' } as StatusReportIndexEntry)
  }
  saveMasterIndex(index)
}

export function toggleFavorite(id: string): void {
  const index = getMasterIndex()
  const idx = index.findIndex((e) => e.id === id)
  if (idx === -1) return
  index[idx] = { ...index[idx], favorite: !index[idx].favorite }
  saveMasterIndex(index)
}

export function concludeReport(id: string): void {
  const index = getMasterIndex()
  const idx = index.findIndex((e) => e.id === id)
  if (idx === -1) return
  index[idx] = { ...index[idx], status: 'concluded' }
  saveMasterIndex(index)
}

export function reactivateReport(id: string): void {
  const index = getMasterIndex()
  const idx = index.findIndex((e) => e.id === id)
  if (idx === -1) return
  index[idx] = { ...index[idx], status: 'active' }
  saveMasterIndex(index)
}

export function removeFromMasterIndex(id: string): void {
  const index = getMasterIndex().filter((e) => e.id !== id)
  saveMasterIndex(index)
}

// ─── Supabase ────────────────────────────────────────────────────────────────

export async function persistToServer(state: StatusReportState): Promise<void> {
  await supabase.from('status_reports').upsert({
    id: state.id,
    data: state,
    status: 'active',
    updated_at: new Date().toISOString(),
  })
}

export async function loadFromServer(id: string): Promise<StatusReportState | null> {
  try {
    const { data, error } = await supabase
      .from('status_reports')
      .select('data')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return normalizeState(data.data)
  } catch {
    return null
  }
}

export async function deleteFromServer(id: string): Promise<void> {
  await supabase.from('status_reports').delete().eq('id', id)
}

export async function syncAllFromSupabase(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('status_reports')
      .select('id, data, updated_at')
    if (error || !data || data.length === 0) return

    const remoteEntries: StatusReportIndexEntry[] = []
    for (const row of data) {
      const state = normalizeState(row.data)
      saveToLocalStorage(state)
      remoteEntries.push({
        id: state.id,
        title: state.config.title || 'S/ Titulo',
        squad: state.config.squad || '',
        itemCount: state.items.length,
        updatedAt: row.updated_at,
      })
    }

    // Merge with local (preserve order)
    const localIndex = getMasterIndex()
    const merged = remoteEntries.map((remote) => {
      const local = localIndex.find((l) => l.id === remote.id)
      return local ? { ...local, ...remote } : remote
    })
    saveMasterIndex(merged)
  } catch (e) {
    console.warn('[StatusReport] syncAllFromSupabase falhou — usando dados locais.', e)
  }
}

export function initRealtimeSubscription(
  reportId: string,
  onUpdate: (state: StatusReportState) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`status-report:${reportId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'status_reports',
        filter: `id=eq.${reportId}`,
      },
      (payload) => {
        if (!payload.new?.data) return
        const incoming = normalizeState(payload.new.data)
        saveToLocalStorage(incoming)
        upsertMasterIndex(incoming)
        onUpdate(incoming)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
