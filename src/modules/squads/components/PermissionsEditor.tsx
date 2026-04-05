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
    <div className="card-sm" style={{ background: 'var(--color-bg)' }}>
      <span className="section-label mb-2 block">
        Permissões
      </span>

      {/* Grid header */}
      <div className="grid items-center pb-1.5 mb-1.5" style={{
        gridTemplateColumns: '1fr repeat(3, 64px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span className="text-small" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Recurso</span>
        {PERMISSION_GROUPS.map((g) => (
          <label key={g.id} className="flex flex-col items-center gap-0.5 text-center" style={{ cursor: disabled ? 'default' : 'pointer' }}>
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
        <div key={res} className="grid items-center py-1.5" style={{
          gridTemplateColumns: '1fr repeat(3, 64px)',
          borderBottom: '0.5px solid var(--color-border)',
        }}>
          <span className="text-small" style={{ fontWeight: 500, color: 'var(--color-text)' }}>
            {RESOURCE_LABELS[res]}
          </span>
          {PERMISSION_GROUPS.map((g) => {
            const key = `${g.id}_${res}` as keyof MemberPermissions
            return (
              <div key={g.id} className="text-center">
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
