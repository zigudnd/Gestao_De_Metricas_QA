import type { StatusReportState, StatusReportConfig, StatusReportIndexEntry } from '../types/statusReport.types'
import { DEFAULT_SECTIONS } from '../types/statusReport.types'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { uid } from '@/lib/uid'

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
    sections: structuredClone(DEFAULT_SECTIONS),
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
    ? structuredClone(raw)
    : createDefaultState('sr_' + uid())

  if (!s.id) s.id = 'sr_' + uid()
  if (!s.config) s.config = { ...DEFAULT_CONFIG }
  if (!s.config.title) s.config.title = 'Status Report'
  if (!s.config.date) s.config.date = new Date().toISOString().split('T')[0]
  if (s.config.squad === undefined) s.config.squad = ''
  if (s.config.period === undefined) s.config.period = ''
  if (s.config.periodStart === undefined) s.config.periodStart = ''
  if (s.config.periodEnd === undefined) s.config.periodEnd = ''
  if (!Array.isArray(s.sections) || s.sections.length === 0) {
    s.sections = structuredClone(DEFAULT_SECTIONS)
  }
  if (!Array.isArray(s.items)) s.items = []
  if (!s.createdAt) s.createdAt = now
  if (!s.updatedAt) s.updatedAt = now

  s.items.forEach((item) => {
    if (!item.id) item.id = 'sr_' + uid()
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
    if (import.meta.env.DEV) console.error('[StatusReport] Erro ao salvar no localStorage:', e)
  }
}

export function loadFromLocalStorage(id: string): StatusReportState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(id))
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[StatusReport] Failed to load from localStorage:', e)
    return null
  }
}

export function deleteFromLocalStorage(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(id))
  } catch (e) { if (import.meta.env.DEV) console.warn('[StatusReport] Failed to delete from localStorage:', e) }
}

// ─── Master Index ────────────────────────────────────────────────────────────

export function getMasterIndex(): StatusReportIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[StatusReport] Failed to load master index:', e)
    return []
  }
}

export function saveMasterIndex(index: StatusReportIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch (e) {
    if (import.meta.env.DEV) console.error('[StatusReport] Erro ao salvar indice:', e)
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

export async function concludeReport(id: string): Promise<void> {
  const index = getMasterIndex()
  const idx = index.findIndex((e) => e.id === id)
  if (idx === -1) return
  const previousEntry = { ...index[idx] }
  index[idx] = { ...index[idx], status: 'concluded' }
  saveMasterIndex(index)
  const { error } = await supabase.from('status_reports').update({ status: 'concluded' }).eq('id', id)
  if (error) {
    const rollbackIndex = getMasterIndex()
    const rollbackIdx = rollbackIndex.findIndex((e) => e.id === id)
    if (rollbackIdx >= 0) {
      rollbackIndex[rollbackIdx] = previousEntry
      saveMasterIndex(rollbackIndex)
    }
    if (import.meta.env.DEV) console.error('[StatusReport] concludeReport server update failed:', error.message)
    throw error
  }
}

export async function reactivateReport(id: string): Promise<void> {
  const index = getMasterIndex()
  const idx = index.findIndex((e) => e.id === id)
  if (idx === -1) return
  const previousEntry = { ...index[idx] }
  index[idx] = { ...index[idx], status: 'active' }
  saveMasterIndex(index)
  const { error } = await supabase.from('status_reports').update({ status: 'active' }).eq('id', id)
  if (error) {
    const rollbackIndex = getMasterIndex()
    const rollbackIdx = rollbackIndex.findIndex((e) => e.id === id)
    if (rollbackIdx >= 0) {
      rollbackIndex[rollbackIdx] = previousEntry
      saveMasterIndex(rollbackIndex)
    }
    if (import.meta.env.DEV) console.error('[StatusReport] reactivateReport server update failed:', error.message)
    throw error
  }
}

export function removeFromMasterIndex(id: string): void {
  const index = getMasterIndex().filter((e) => e.id !== id)
  saveMasterIndex(index)
}

// ─── Supabase ────────────────────────────────────────────────────────────────

export async function persistToServer(state: StatusReportState, squadId?: string, updatedAt?: string): Promise<void> {
  const entry = getMasterIndex().find((e) => e.id === state.id)
  const status = entry?.status ?? 'active'
  const { error } = await supabase.from('status_reports').upsert({
    id: state.id,
    data: state,
    squad_id: squadId ?? entry?.squadId ?? null,
    status,
    updated_at: updatedAt ?? new Date().toISOString(),
  })
  if (error) {
    if (import.meta.env.DEV) console.error('[StatusReport] persistToServer failed:', error.message)
    throw error
  }
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
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[StatusReport] Failed to load from server:', e)
    return null
  }
}

export async function deleteFromServer(id: string): Promise<void> {
  const { error } = await supabase.from('status_reports').delete().eq('id', id)
  if (error) {
    if (import.meta.env.DEV) console.error('[StatusReport] deleteFromServer failed:', error.message)
    throw error
  }
}

const LAST_SYNC_KEY = 'statusReportLastSync'

/**
 * Incremental sync: fetches only status reports updated since the last sync timestamp.
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
        .from('status_reports')
        .select('id, data, squad_id, status, updated_at')
        .gt('updated_at', lastSync)
        .order('updated_at', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        const state = normalizeState(row.data)
        saveToLocalStorage(state)

        const existing = localIndex.find((l) => l.id === state.id)
        const entry: StatusReportIndexEntry = {
          id: state.id,
          title: state.config.title || 'S/ Titulo',
          squad: state.config.squad || '',
          squadId: row.squad_id ?? existing?.squadId,
          itemCount: state.items.length,
          updatedAt: row.updated_at,
          periodStart: state.config.periodStart || '',
          periodEnd: state.config.periodEnd || '',
          favorite: existing?.favorite ?? false,
          status: (row.status as StatusReportIndexEntry['status']) ?? existing?.status ?? 'active',
        }

        const idx = localIndex.findIndex((l) => l.id === state.id)
        if (idx >= 0) localIndex[idx] = { ...localIndex[idx], ...entry }
        else localIndex.unshift(entry)
      }

      totalSynced += data.length
      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    saveMasterIndex(localIndex)
    localStorage.setItem(LAST_SYNC_KEY, now)

    if (import.meta.env.DEV) console.log(`[Sync] ${totalSynced} status report(s) sincronizado(s)`)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[StatusReport] syncAllFromSupabase falhou — usando dados locais.', e)
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
