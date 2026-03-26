import { useState } from 'react'
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

// ─── LogoutModal ──────────────────────────────────────────────────────────────

function LogoutModal({ profile, onConfirm, onCancel }: {
  profile: { display_name: string; email: string } | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderTop: '3px solid #185FA5',
          borderRadius: 12,
          padding: '24px 22px',
          width: 340,
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#E6F1FB', color: '#185FA5',
            border: '2px solid #B5D4F4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>
            {(profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {profile?.display_name ?? '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
              {profile?.email ?? ''}
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5 }}>
          Deseja sair da sua conta?
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--color-border-md)',
              borderRadius: 7, fontSize: 13, cursor: 'pointer',
              color: 'var(--color-text-2)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              background: '#185FA5',
              border: 'none',
              borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', color: '#fff',
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── UserSection ──────────────────────────────────────────────────────────────

function UserSection() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogout, setShowLogout] = useState(false)
  const initial = (profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()
  const isProfile = location.pathname === '/profile'

  return (
    <>
      {/* Avatar → perfil */}
      <button
        title={`${profile?.display_name ?? ''} — ver perfil`}
        onClick={() => navigate('/profile')}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isProfile ? '#d0e8f9' : '#E6F1FB',
          color: '#185FA5',
          border: isProfile ? '2px solid #7ab8e8' : '2px solid #B5D4F4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          flexShrink: 0, letterSpacing: '-0.5px',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#d0e8f9'
          e.currentTarget.style.borderColor = '#7ab8e8'
        }}
        onMouseLeave={(e) => {
          if (!isProfile) {
            e.currentTarget.style.background = '#E6F1FB'
            e.currentTarget.style.borderColor = '#B5D4F4'
          }
        }}
      >
        {initial}
      </button>

      {/* Botão sair */}
      <button
        onClick={() => setShowLogout(true)}
        title="Sair"
        style={{
          width: 36, height: 36, borderRadius: 9,
          border: 'none', background: 'transparent',
          color: 'var(--color-text-3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FCEBEB'
          e.currentTarget.style.color = '#E24B4A'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-3)'
        }}
      >
        ⏻
      </button>

      {showLogout && (
        <LogoutModal
          profile={profile}
          onConfirm={() => { setShowLogout(false); signOut() }}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
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
        width: 56, flexShrink: 0,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0', gap: 4,
      }}
    >
      <div style={{
        width: 32, height: 32, background: '#0c447c',
        borderRadius: 9, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 14,
        marginBottom: 12, flexShrink: 0, letterSpacing: '-0.5px',
      }}>
        TS
      </div>

      <NavItem icon="⊞" label="Sprints" active={isSprints} onClick={() => navigate('/sprints')} />
      <NavItem icon="👥" label="Squads"  active={isSquads}  onClick={() => navigate('/squads')} />
      <NavItem icon="📄" label="Relatórios" disabled />

      <div style={{ flex: 1 }} />
      <div style={{ width: 28, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
      <NavItem icon="📖" label="Documentação" active={location.pathname === '/docs'} onClick={() => navigate('/docs')} />
      <div style={{ width: 28, height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
      <UserSection />
    </aside>
  )
}
