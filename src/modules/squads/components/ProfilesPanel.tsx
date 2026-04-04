import {
  PERMISSION_GROUPS, PERMISSION_RESOURCES, RESOURCE_LABELS,
  type MemberPermissions, type PermissionProfile,
} from '../services/squadsService'
import { inputStyle, btnPrimary, btnGhost } from '@/styles/shared'

const btnDestructive: React.CSSProperties = { padding: '5px 10px', background: 'none', color: '#A32D2D', border: '1px solid var(--color-red-light)', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' }
const badgeNeutral: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' }
const badgeActive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-green-light)', color: 'var(--color-green)', border: '0.5px solid var(--color-green-mid)' }

export interface ProfilesPanelProps {
  profiles: PermissionProfile[]
  isAdmin: boolean
  profileSearch: string
  setProfileSearch: (v: string) => void
  openNewProfile: () => void
  openEditProfile: (p: PermissionProfile) => void
  setDeleteProfileTarget: (p: PermissionProfile | null) => void
}

export function ProfilesPanel({
  profiles,
  isAdmin,
  profileSearch,
  setProfileSearch,
  openNewProfile,
  openEditProfile,
  setDeleteProfileTarget,
}: ProfilesPanelProps) {
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)' }}>
          Perfis definem conjuntos de permissões reutilizáveis.
        </p>
        {isAdmin && (
          <button onClick={openNewProfile} style={{ ...btnPrimary, flexShrink: 0, marginLeft: 12 }}>+ Novo Perfil</button>
        )}
      </div>
      {profiles.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 14, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-3)', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar perfil..."
            value={profileSearch}
            onChange={(e) => setProfileSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {profiles.filter((p) => {
          if (!profileSearch.trim()) return true
          const q = profileSearch.toLowerCase().trim()
          return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
        }).map((p) => (
          <div key={p.id} style={{
            background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
            borderLeft: p.is_system ? '3px solid var(--color-blue)' : '3px solid var(--color-border)',
            borderRadius: 12, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{p.name}</span>
                  {p.is_system && <span style={badgeNeutral}>PADRÃO</span>}
                </div>
                {p.description && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-2)' }}>{p.description}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PERMISSION_GROUPS.map((g) => {
                    const active = PERMISSION_RESOURCES.filter((res) => p.permissions[`${g.id}_${res}` as keyof MemberPermissions])
                    if (active.length === 0) return null
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: g.color, minWidth: 42 }}>{g.label}:</span>
                        {active.map((res) => (
                          <span key={res} style={{ ...badgeActive, borderColor: g.color + '44', color: g.color, background: g.color + '12' }}>
                            {RESOURCE_LABELS[res]}
                          </span>
                        ))}
                      </div>
                    )
                  })}
                  {PERMISSION_GROUPS.every((g) => PERMISSION_RESOURCES.every((res) => !p.permissions[`${g.id}_${res}` as keyof MemberPermissions])) && (
                    <span style={badgeNeutral}>Somente leitura</span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEditProfile(p)} style={btnGhost}>Editar</button>
                  {!p.is_system && (
                    <button onClick={() => setDeleteProfileTarget(p)} style={btnDestructive}>Excluir</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
