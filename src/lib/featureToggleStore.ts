import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeatureKey = 'status_report' | 'sprints' | 'releases' | 'prs' | 'docs'

export type FeatureToggles = Record<FeatureKey, boolean>

export const FEATURE_KEYS: FeatureKey[] = ['status_report', 'sprints', 'releases', 'prs', 'docs']

export const FEATURE_META: Record<FeatureKey, { label: string; description: string }> = {
  status_report: { label: 'Status Report', description: 'Relatórios de status semanais por squad/projeto' },
  sprints:       { label: 'Cobertura QA', description: 'Dashboard de sprints, métricas e bugs' },
  releases:      { label: 'Releases', description: 'Pipeline de releases e regressivos' },
  prs:           { label: 'Gestão de PRs', description: 'Gestão de Pull Requests por release' },
  docs:          { label: 'Documentação', description: 'Documentação do sistema' },
}

const DEFAULT_TOGGLES: FeatureToggles = {
  status_report: true,
  sprints: true,
  releases: true,
  prs: true,
  docs: true,
}

// ─── localStorage ────────────────────────────────────────────────────────────

const LS_KEY = 'appFeatureToggles'

function loadFromLS(): FeatureToggles {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULT_TOGGLES, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_TOGGLES }
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface FeatureToggleState {
  toggles: FeatureToggles
  loaded: boolean
  isEnabled: (key: FeatureKey) => boolean
  loadFromSupabase: () => Promise<void>
  setToggle: (key: FeatureKey, enabled: boolean) => Promise<void>
}

export const useFeatureToggleStore = create<FeatureToggleState>((set, get) => ({
  toggles: loadFromLS(),
  loaded: false,

  isEnabled: (key) => get().toggles[key] ?? true,

  loadFromSupabase: async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('feature_toggles')
        .eq('id', 'default')
        .single()
      if (data?.feature_toggles) {
        const toggles: FeatureToggles = { ...DEFAULT_TOGGLES, ...(data.feature_toggles as Partial<FeatureToggles>) }
        localStorage.setItem(LS_KEY, JSON.stringify(toggles))
        set({ toggles, loaded: true })
        return
      }
    } catch {
      // Supabase not available — use localStorage cache
    }
    set({ loaded: true })
  },

  setToggle: async (key, enabled) => {
    const toggles = { ...get().toggles, [key]: enabled }
    set({ toggles })
    localStorage.setItem(LS_KEY, JSON.stringify(toggles))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('app_settings')
        .update({ feature_toggles: toggles, updated_by: user?.id ?? null })
        .eq('id', 'default')
    } catch {
      // offline — localStorage already updated
    }
  },
}))
