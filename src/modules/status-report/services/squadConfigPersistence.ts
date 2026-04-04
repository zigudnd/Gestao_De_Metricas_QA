import type { SquadConfigState } from '../types/squadConfig.types'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Storage Keys ────────────────────────────────────────────────────────────

export const STORAGE_KEY = (squadId: string) => `squadConfig_${squadId}`
export const INDEX_KEY = 'squadConfigIndex'

// ─── Default State ───────────────────────────────────────────────────────────

export function getDefaultState(squadId: string): SquadConfigState {
  const now = new Date().toISOString()
  return {
    squadId,
    dor: [
      'Historia tem criterios de aceite definidos e aprovados pelo PO',
      'Estimativa de story points realizada pelo time em planning',
      'Dependencias tecnicas identificadas e mapeadas',
      'Prototipo ou mockup disponivel (quando aplicavel)',
    ],
    dod: [
      'Codigo revisado por pelo menos 1 desenvolvedor (PR aprovado)',
      'Build passando sem erros de TypeScript ou lint',
      'Testes unitarios cobrindo os criterios de aceite criticos',
      'Smoke test executado pelo QA em ambiente de homologacao',
    ],
    acordos: [
      'Horario de core: 10h as 17h — sem reunioes fora deste horario',
      'Pull requests respondidos em ate 4h durante o horario de core',
      'Daily com maximo de 15 minutos — impedimentos detalhados fora',
    ],
    cerimonias: [
      { id: 'c1', nome: 'Daily', dia: 'Seg a Sex — 09h30', duracao: '15 min' },
      { id: 'c2', nome: 'Planning', dia: 'Segunda do inicio do sprint', duracao: '2h' },
      { id: 'c3', nome: 'Review', dia: 'Sexta do fim do sprint', duracao: '1h' },
      { id: 'c4', nome: 'Retrospectiva', dia: 'Sexta do fim do sprint', duracao: '1h' },
    ],
    storyPointsMethod: 'fibonacci',
    storyPointsNotas: '',
    membros: [],
    offs: [],
    updatedAt: now,
  }
}

// ─── Normalize ───────────────────────────────────────────────────────────────

export function normalizeState(raw: unknown): SquadConfigState {
  const s = (raw && typeof raw === 'object' ? structuredClone(raw) : getDefaultState('default')) as SquadConfigState
  if (!s.squadId) s.squadId = 'default'
  if (!Array.isArray(s.dor)) s.dor = []
  if (!Array.isArray(s.dod)) s.dod = []
  if (!Array.isArray(s.acordos)) s.acordos = []
  if (!Array.isArray(s.cerimonias)) s.cerimonias = []
  if (!s.storyPointsMethod) s.storyPointsMethod = 'fibonacci'
  if (s.storyPointsNotas === undefined) s.storyPointsNotas = ''
  if (!Array.isArray(s.membros)) s.membros = []
  if (!Array.isArray(s.offs)) s.offs = []
  if (!s.updatedAt) s.updatedAt = new Date().toISOString()
  return s
}

// ─── localStorage ────────────────────────────────────────────────────────────

export function saveToLocalStorage(state: SquadConfigState): void {
  try {
    localStorage.setItem(STORAGE_KEY(state.squadId ?? 'default'), JSON.stringify(state))
    // Update index
    const idx = getIndex()
    const existing = idx.findIndex((e) => e.squadId === state.squadId)
    const entry = { squadId: state.squadId ?? 'default', updatedAt: state.updatedAt }
    if (existing >= 0) idx[existing] = entry
    else idx.push(entry)
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx))
  } catch (e) {
    if (import.meta.env.DEV) console.error('[SquadConfig] Erro ao salvar localStorage:', e)
  }
}

export function loadFromLocalStorage(squadId: string): SquadConfigState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(squadId))
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[SquadConfig] Failed to load from localStorage:', e)
    return null
  }
}

function getIndex(): { squadId: string; updatedAt: string }[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as { squadId: string; updatedAt: string }[]
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[SquadConfig] Failed to load index from localStorage:', e)
    return []
  }
}

// ─── Supabase ────────────────────────────────────────────────────────────────

export async function persistToServer(state: SquadConfigState): Promise<void> {
  if (!state.squadId || state.squadId === 'default') return
  await supabase.from('squad_config').upsert({
    squad_id: state.squadId,
    data: state,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'squad_id' })
}

export async function loadFromServer(squadId: string): Promise<SquadConfigState | null> {
  if (!squadId || squadId === 'default') return null
  try {
    const { data, error } = await supabase
      .from('squad_config')
      .select('data')
      .eq('squad_id', squadId)
      .single()
    if (error || !data) return null
    return normalizeState(data.data)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[SquadConfig] Failed to load from server:', e)
    return null
  }
}

export function initRealtimeSubscription(
  squadId: string,
  onUpdate: (state: SquadConfigState) => void,
): () => void {
  if (!squadId || squadId === 'default') return () => {}
  const channel: RealtimeChannel = supabase
    .channel(`squad-config:${squadId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'squad_config',
        filter: `squad_id=eq.${squadId}`,
      },
      (payload) => {
        if (!payload.new?.data) return
        const incoming = normalizeState(payload.new.data)
        saveToLocalStorage(incoming)
        onUpdate(incoming)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
