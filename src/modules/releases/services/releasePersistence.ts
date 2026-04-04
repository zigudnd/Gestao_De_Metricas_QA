import type { Release, ReleaseIndexEntry } from '../types/release.types'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Storage Keys ────────────────────────────────────────────────────────────

export const STORAGE_KEY = (id: string) => `releaseData_${id}`
export const INDEX_KEY = 'releaseMasterIndex'

// ─── Default State ───────────────────────────────────────────────────────────

export function createDefaultRelease(id: string): Release {
  const now = new Date().toISOString()
  return {
    id,
    version: '',
    title: '',
    description: '',
    status: 'planejada',
    productionDate: '',
    cutoffDate: '',
    buildDate: '',
    homologacaoStart: '',
    homologacaoEnd: '',
    betaDate: '',
    squads: [],
    checkpoints: [],
    statusHistory: [],
    platforms: [],
    nonBlockingFeatures: [],
    rolloutPct: 0,
    createdAt: now,
    updatedAt: now,
  }
}

// ─── Normalize ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRelease(raw: any): Release {
  const now = new Date().toISOString()
  const r: Release = raw
    ? structuredClone(raw)
    : createDefaultRelease('rel_' + Date.now())

  if (!r.id) r.id = 'rel_' + Date.now()
  if (!r.version) r.version = ''
  if (!r.title) r.title = ''
  if (!r.description) r.description = ''
  if (!r.status) r.status = 'planejada'
  if (!r.productionDate) r.productionDate = ''
  if (!r.cutoffDate) r.cutoffDate = ''
  if (!r.buildDate) r.buildDate = ''
  if (!r.homologacaoStart) r.homologacaoStart = ''
  if (!r.homologacaoEnd) r.homologacaoEnd = ''
  if (!r.betaDate) r.betaDate = ''
  if (!Array.isArray(r.squads)) r.squads = []
  if (!Array.isArray(r.checkpoints)) r.checkpoints = []
  if (!Array.isArray(r.statusHistory)) r.statusHistory = []
  if (!Array.isArray(r.platforms)) r.platforms = []
  if (!Array.isArray(r.nonBlockingFeatures)) r.nonBlockingFeatures = []
  if (typeof r.rolloutPct !== 'number') r.rolloutPct = 0
  if (!r.createdAt) r.createdAt = now
  if (!r.updatedAt) r.updatedAt = now

  r.squads.forEach((sq) => {
    if (!sq.id) sq.id = 'sq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    if (!sq.squadId) sq.squadId = ''
    if (!sq.squadName) sq.squadName = ''
    if (!sq.status) sq.status = 'not_started'
    if (!Array.isArray(sq.suites)) sq.suites = []
    if (!Array.isArray(sq.features)) sq.features = []
    if (!Array.isArray(sq.bugs)) sq.bugs = []
    if (!Array.isArray(sq.blockers)) sq.blockers = []
    if (sq.notes === undefined) sq.notes = ''
    if (sq.hasNewFeatures === undefined) sq.hasNewFeatures = false
  })

  return r
}

// ─── localStorage ────────────────────────────────────────────────────────────

export function saveToLocalStorage(release: Release): void {
  try {
    localStorage.setItem(STORAGE_KEY(release.id), JSON.stringify(release))
  } catch (e) {
    if (import.meta.env.DEV) console.error('[Release] Erro ao salvar no localStorage:', e)
  }
}

export function loadFromLocalStorage(id: string): Release | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(id))
    if (!raw) return null
    return normalizeRelease(JSON.parse(raw))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Releases] Failed to load from localStorage:', e)
    return null
  }
}

export function deleteFromLocalStorage(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(id))
  } catch (e) { if (import.meta.env.DEV) console.warn('[Releases] Failed to delete from localStorage:', e) }
}

// ─── Master Index ────────────────────────────────────────────────────────────

export function getMasterIndex(): ReleaseIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Releases] Failed to load master index:', e)
    return []
  }
}

export function saveMasterIndex(index: ReleaseIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch (e) {
    if (import.meta.env.DEV) console.error('[Release] Erro ao salvar indice:', e)
  }
}

export function upsertMasterIndex(release: Release): void {
  const index = getMasterIndex()
  const entry: Partial<ReleaseIndexEntry> = {
    id: release.id,
    version: release.version || '',
    title: release.title || 'S/ Titulo',
    status: release.status,
    productionDate: release.productionDate || '',
    squadCount: release.squads.length,
    updatedAt: release.updatedAt,
  }

  const idx = index.findIndex((e) => e.id === release.id)
  if (idx >= 0) {
    index[idx] = { ...index[idx], ...entry }
  } else {
    index.unshift({ ...entry, favorite: false } as ReleaseIndexEntry)
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

export function removeFromMasterIndex(id: string): void {
  const index = getMasterIndex().filter((e) => e.id !== id)
  saveMasterIndex(index)
}

// ─── Supabase ────────────────────────────────────────────────────────────────

export async function persistToServer(release: Release, updatedAt?: string): Promise<void> {
  const { error } = await supabase.from('releases').upsert({
    id: release.id,
    data: release,
    status: release.status,
    version: release.version || null,
    production_date: release.productionDate || null,
    updated_at: updatedAt ?? new Date().toISOString(),
  })
  if (error) {
    if (import.meta.env.DEV) console.error('[Releases] persistToServer failed:', error.message)
    throw error
  }
}

export async function loadFromServer(id: string): Promise<Release | null> {
  try {
    const { data, error } = await supabase
      .from('releases')
      .select('data')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return normalizeRelease(data.data)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Releases] Failed to load from server:', e)
    return null
  }
}

export async function deleteFromServer(id: string): Promise<void> {
  const { error } = await supabase.from('releases').delete().eq('id', id)
  if (error) {
    if (import.meta.env.DEV) console.error('[Releases] deleteFromServer failed:', error.message)
    throw error
  }
}

export async function syncAllReleases(): Promise<void> {
  try {
    const PAGE_SIZE = 100
    const remoteEntries: ReleaseIndexEntry[] = []
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('releases')
        .select('id, data, status, version, production_date, updated_at')
        .range(offset, offset + PAGE_SIZE - 1)
      if (error || !data || data.length === 0) break

      for (const row of data) {
        const release = normalizeRelease(row.data)
        saveToLocalStorage(release)
        remoteEntries.push({
          id: release.id,
          version: release.version || '',
          title: release.title || 'S/ Titulo',
          status: release.status,
          productionDate: release.productionDate || '',
          squadCount: release.squads.length,
          updatedAt: row.updated_at,
        })
      }

      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    if (remoteEntries.length === 0) return

    // Merge with local (preserve favorites)
    const localIndex = getMasterIndex()
    const merged = remoteEntries.map((remote) => {
      const local = localIndex.find((l) => l.id === remote.id)
      return local ? { ...local, ...remote } : remote
    })
    saveMasterIndex(merged)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Release] syncAllReleases falhou — usando dados locais.', e)
  }
}

export function initRealtimeSubscription(
  releaseId: string,
  onUpdate: (release: Release) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`release:${releaseId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'releases',
        filter: `id=eq.${releaseId}`,
      },
      (payload) => {
        if (!payload.new?.data) return
        const incoming = normalizeRelease(payload.new.data)
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
