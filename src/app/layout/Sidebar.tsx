import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'

// ─── NavItem ──────────────────────────────────────────────────────────────────

const NavItem = ({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) => (
  <button
    title={disabled ? `${label} — em breve` : label}
    onClick={disabled ? undefined : onClick}
    style={{
      width: 40,
      height: 40,
      borderRadius: 9,
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      background: active ? 'var(--color-blue-light)' : 'transparent',
      color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
      transition: 'background 0.15s, color 0.15s',
    }}
  >
    {icon}
  </button>
)

// ─── UserAvatar ───────────────────────────────────────────────────────────────

function UserAvatar() {
  const { profile, signOut } = useAuthStore()
  const initial = (profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()

  return (
    <button
      title={`${profile?.display_name ?? profile?.email ?? ''}\nClique para sair`}
      onClick={signOut}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#E6F1FB',
        color: '#185FA5',
        border: '1.5px solid #B5D4F4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
        letterSpacing: '-0.5px',
      }}
    >
      {initial}
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSprints = location.pathname.startsWith('/sprints')
  const isSquads  = location.pathname.startsWith('/squads')

  return (
    <aside
      style={{
        width: 56,
        flexShrink: 0,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 4,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0c447c',
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 12,
          flexShrink: 0,
          letterSpacing: '-0.5px',
        }}
      >
        TS
      </div>

      <NavItem icon="⊞" label="Sprints" active={isSprints} onClick={() => navigate('/sprints')} />
      <NavItem icon="👥" label="Squads" active={isSquads} onClick={() => navigate('/squads')} />
      <NavItem icon="📄" label="Relatórios" disabled />

      <div style={{ flex: 1 }} />
      <div style={{ width: 28, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
      <NavItem icon="📖" label="Documentação" active={location.pathname === '/docs'} onClick={() => navigate('/docs')} />
      <div style={{ width: 28, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

      {/* Avatar + Logout */}
      <UserAvatar />
    </aside>
  )
}
