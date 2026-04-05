import {
  PERMISSION_GROUPS, PERMISSION_RESOURCES, RESOURCE_LABELS,
  type MemberPermissions, type PermissionGroup,
} from '../services/squadsService'

export interface PermissionsEditorProps {
  value: MemberPermissions
  onChange: (p: MemberPermissions) => void
  disabled?: boolean
}

export function PermissionsEditor({
  value,
  onChange,
  disabled,
}: PermissionsEditorProps) {
  function toggleGroup(group: PermissionGroup, checked: boolean) {
    const updates: Partial<MemberPermissions> = {}
    for (const res of PERMISSION_RESOURCES) {
      const key = `${group}_${res}` as keyof MemberPermissions
      updates[key] = checked
    }
    onChange({ ...value, ...updates })
  }

  function isGroupAllChecked(group: PermissionGroup): boolean {
    return PERMISSION_RESOURCES.every((res) => value[`${group}_${res}` as keyof MemberPermissions])
  }

  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--color-bg)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)', marginBottom: 8, display: 'block' }}>
        Permissões
      </span>

      {/* Grid header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr repeat(3, 64px)',
        gap: 0, alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 6, marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Recurso</span>
        {PERMISSION_GROUPS.map((g) => (
          <label key={g.id} style={{ textAlign: 'center', cursor: disabled ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <input
              type="checkbox"
              checked={isGroupAllChecked(g.id)}
              disabled={disabled}
              onChange={(e) => toggleGroup(g.id, e.target.checked)}
              style={{ width: 13, height: 13, accentColor: g.color, cursor: disabled ? 'default' : 'pointer' }}
            />
            <span style={{ fontSize: 10, fontWeight: 600, color: g.color }}>{g.label}</span>
          </label>
        ))}
      </div>

      {/* Grid rows */}
      {PERMISSION_RESOURCES.map((res) => (
        <div key={res} style={{
          display: 'grid',
          gridTemplateColumns: '1fr repeat(3, 64px)',
          gap: 0, alignItems: 'center',
          padding: '5px 0',
          borderBottom: '0.5px solid var(--color-border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 500 }}>
            {RESOURCE_LABELS[res]}
          </span>
          {PERMISSION_GROUPS.map((g) => {
            const key = `${g.id}_${res}` as keyof MemberPermissions
            return (
              <div key={g.id} style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={value[key] ?? false}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
                  style={{ width: 14, height: 14, accentColor: g.color, cursor: disabled ? 'default' : 'pointer' }}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
