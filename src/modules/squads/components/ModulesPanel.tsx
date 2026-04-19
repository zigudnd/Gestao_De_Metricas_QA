import { useState } from 'react'
import {
  useFeatureToggleStore,
  FEATURE_KEYS,
  FEATURE_META,
  type FeatureKey,
} from '@/lib/featureToggleStore'

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--color-blue)' : 'var(--color-border-md)',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

// ─── Icons per feature ───────────────────────────────────────────────────────

const FEATURE_ICONS: Record<FeatureKey, React.ReactNode> = {
  status_report: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16V12" strokeWidth="2.5" />
      <path d="M8 16V9" strokeWidth="2.5" />
      <path d="M12 16V6" strokeWidth="2.5" />
      <path d="M11 5l3-2.5" strokeWidth="1.8" />
      <path d="M12.5 2.5H14V4" strokeWidth="1.4" />
    </svg>
  ),
  sprints: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5L3.5 5.5v4c0 4.2 2.8 7.2 6.5 8.5 3.7-1.3 6.5-4.3 6.5-8.5v-4L10 2.5z" />
      <circle cx="9.5" cy="9.5" r="2.8" />
      <path d="M11.5 11.5l2 2" strokeWidth="2" />
    </svg>
  ),
  releases: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15.5v-3" />
      <path d="M7 17l3-4.5 3 4.5" />
      <path d="M10 2.5c-2 2-3.5 5-3.5 8.5h7c0-3.5-1.5-6.5-3.5-8.5z" />
      <circle cx="10" cy="8" r="1.2" />
    </svg>
  ),
  prs: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5.5" r="2" />
      <circle cx="14" cy="14.5" r="2" />
      <path d="M6 7.5v9" />
      <path d="M14 12.5V8c0-1.5-1-2.5-2.5-2.5H9" />
      <path d="M11 3.5L9 5.5l2 2" />
    </svg>
  ),
  docs: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4c1.5-.8 3.5-1 5-1 1.5 0 2.5.5 2.5.5" />
      <path d="M3 4v12c1.5-.5 3.5-.5 5-.2 1.5.3 2.5.7 2.5.7" />
      <path d="M17 4c-1.5-.8-3.5-1-5-1-1.5 0-2.5.5-2.5.5" />
      <path d="M17 4v12c-1.5-.5-3.5-.5-5-.2-1.5.3-2.5.7-2.5.7" />
      <path d="M10.5 3.5v13" />
    </svg>
  ),
}

// ─── ModulesPanel ────────────────────────────────────────────────────────────

export function ModulesPanel() {
  const { toggles, setToggle } = useFeatureToggleStore()
  const [saving, setSaving] = useState<FeatureKey | null>(null)

  async function handleToggle(key: FeatureKey, enabled: boolean) {
    setSaving(key)
    await setToggle(key, enabled)
    setSaving(null)
  }

  const enabledCount = FEATURE_KEYS.filter((k) => toggles[k]).length

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
          Módulos do Sistema
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)' }}>
          Ative ou desative módulos para todos os usuários. Módulos desativados ficam ocultos no menu lateral e suas rotas ficam inacessíveis.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 10, padding: '4px 12px', borderRadius: 8,
          background: 'var(--color-surface-2)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)',
        }}>
          {enabledCount} de {FEATURE_KEYS.length} módulos ativos
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FEATURE_KEYS.map((key) => {
          const meta = FEATURE_META[key]
          const enabled = toggles[key]
          const isSaving = saving === key

          return (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                background: enabled ? 'var(--color-surface)' : 'var(--color-bg)',
                border: `0.5px solid ${enabled ? 'var(--color-border)' : 'var(--color-border)'}`,
                borderRadius: 10,
                opacity: enabled ? 1 : 0.6,
                transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              {/* Icon */}
              <span style={{
                width: 36, height: 36, borderRadius: 9,
                background: enabled ? 'var(--color-blue-light)' : 'var(--color-surface-2)',
                color: enabled ? 'var(--color-blue)' : 'var(--color-text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s, color 0.2s',
              }}>
                {FEATURE_ICONS[key]}
              </span>

              {/* Label + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>
                  {meta.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 1 }}>
                  {meta.description}
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 8,
                background: enabled ? 'var(--color-green-light)' : 'var(--color-surface-2)',
                color: enabled ? 'var(--color-green)' : 'var(--color-text-3)',
                flexShrink: 0,
              }}>
                {enabled ? 'Ativo' : 'Inativo'}
              </span>

              {/* Toggle */}
              <ToggleSwitch
                checked={enabled}
                onChange={(v) => handleToggle(key, v)}
                disabled={isSaving}
              />
            </div>
          )
        })}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 20, padding: '12px 16px', borderRadius: 8,
        background: 'var(--color-amber-light)', border: '0.5px solid var(--color-amber-mid)',
        fontSize: 12, color: 'var(--color-amber)', lineHeight: 1.5,
      }}>
        <strong>Nota:</strong> O módulo "Cadastros" (administração de squads, usuários e permissões) e a "Página Inicial" estão sempre ativos e não podem ser desabilitados.
      </div>
    </div>
  )
}
