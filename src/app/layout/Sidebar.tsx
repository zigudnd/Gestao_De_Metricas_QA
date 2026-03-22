import { useLocation, useNavigate } from 'react-router-dom'

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

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSprints = location.pathname.startsWith('/sprints')

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
      <NavItem icon="📄" label="Relatórios" disabled />
      <NavItem icon="👥" label="Equipes" disabled />

      <div style={{ flex: 1 }} />
      <div style={{ width: 28, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
      <NavItem icon="📖" label="Documentação" active={location.pathname === '/docs'} onClick={() => navigate('/docs')} />
      <NavItem icon="⚙" label="Configurações" disabled />
    </aside>
  )
}
