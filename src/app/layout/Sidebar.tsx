import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'

// ─── SVG Icons (20×20, stroke-based, currentColor) ──────────────────────────

const IconSprints = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {/* Shield body */}
    <path d="M10 2.5L3.5 5.5v4c0 4.2 2.8 7.2 6.5 8.5 3.7-1.3 6.5-4.3 6.5-8.5v-4L10 2.5z" />
    {/* Magnifying glass inside shield */}
    <circle cx="9.5" cy="9.5" r="2.8" />
    <path d="M11.5 11.5l2 2" strokeWidth="2" />
  </svg>
)

const IconSquads = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="6.5" r="2.5" />
    <path d="M5.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
    <circle cx="4" cy="8.5" r="1.8" />
    <path d="M1.5 15c0-1.8 1.1-3.2 2.5-3.5" />
    <circle cx="16" cy="8.5" r="1.8" />
    <path d="M18.5 15c0-1.8-1.1-3.2-2.5-3.5" />
  </svg>
)

const IconStatusReport = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {/* 3 bars (progress) */}
    <path d="M4 16V12" strokeWidth="2.5" />
    <path d="M8 16V9" strokeWidth="2.5" />
    <path d="M12 16V6" strokeWidth="2.5" />
    {/* Trend arrow going up-right */}
    <path d="M11 5l3-2.5" strokeWidth="1.8" />
    <path d="M12.5 2.5H14V4" strokeWidth="1.4" />
  </svg>
)

const IconReleases = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {/* Rocket / deploy icon */}
    <path d="M10 15.5v-3" />
    <path d="M7 17l3-4.5 3 4.5" />
    <path d="M10 2.5c-2 2-3.5 5-3.5 8.5h7c0-3.5-1.5-6.5-3.5-8.5z" />
    <circle cx="10" cy="8" r="1.2" />
  </svg>
)

const IconDocs = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4c1.5-.8 3.5-1 5-1 1.5 0 2.5.5 2.5.5" />
    <path d="M3 4v12c1.5-.5 3.5-.5 5-.2 1.5.3 2.5.7 2.5.7" />
    <path d="M17 4c-1.5-.8-3.5-1-5-1-1.5 0-2.5.5-2.5.5" />
    <path d="M17 4v12c-1.5-.5-3.5-.5-5-.2-1.5.3-2.5.7-2.5.7" />
    <path d="M10.5 3.5v13" />
  </svg>
)

const IconChevron = ({ direction }: { direction: 'right' | 'left' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {direction === 'right'
      ? <path d="M6 3l5 5-5 5" />
      : <path d="M10 3l-5 5 5 5" />}
  </svg>
)

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l7-7 7 7" />
    <path d="M5 8.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8.5" />
  </svg>
)

// ─── NavItem ──────────────────────────────────────────────────────────────────

const NavItem = ({
  icon,
  label,
  active,
  expanded,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  expanded: boolean
  disabled?: boolean
  onClick?: () => void
}) => (
  <button
    title={expanded ? undefined : (disabled ? `${label} — em breve` : label)}
    onClick={disabled ? undefined : onClick}
    style={{
      width: expanded ? 'calc(100% - 16px)' : 40,
      height: 38,
      borderRadius: 9,
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: expanded ? 'flex-start' : 'center',
      gap: 10,
      padding: expanded ? '0 12px' : 0,
      fontSize: 18,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      background: active ? 'var(--color-blue-light)' : 'transparent',
      color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
      transition: 'background 0.15s, color 0.15s, width 0.2s',
      flexShrink: 0,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-family-sans)',
    }}
  >
    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
      {icon}
    </span>
    {expanded && (
      <span style={{
        fontSize: 13, fontWeight: active ? 600 : 500,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
    )}
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
          borderTop: '3px solid var(--color-blue)',
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
            background: 'var(--color-blue-light)', color: 'var(--color-blue)',
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
              background: 'var(--color-blue)',
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

function UserSection({ expanded }: { expanded: boolean }) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogout, setShowLogout] = useState(false)
  const initial = (profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()
  const isProfile = location.pathname === '/profile'

  return (
    <>
      <div style={{
        display: 'flex', alignItems: expanded ? 'center' : 'center',
        flexDirection: expanded ? 'row' : 'column',
        gap: expanded ? 8 : 4,
        width: expanded ? 'calc(100% - 16px)' : 'auto',
        padding: expanded ? '0 4px' : 0,
      }}>
        {/* Avatar */}
        <button
          title={expanded ? undefined : `${profile?.display_name ?? ''} — ver perfil`}
          onClick={() => navigate('/profile')}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: isProfile ? '#d0e8f9' : 'var(--color-blue-light)',
            color: 'var(--color-blue)',
            border: isProfile ? '2px solid #7ab8e8' : '2px solid #B5D4F4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            flexShrink: 0, letterSpacing: '-0.5px',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#d0e8f9'
            e.currentTarget.style.borderColor = '#7ab8e8'
          }}
          onMouseLeave={(e) => {
            if (!isProfile) {
              e.currentTarget.style.background = 'var(--color-blue-light)'
              e.currentTarget.style.borderColor = '#B5D4F4'
            }
          }}
        >
          {initial}
        </button>

        {expanded && (
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--color-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {profile?.display_name ?? '—'}
            </div>
            <div style={{
              fontSize: 10, color: 'var(--color-text-3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {profile?.email ?? ''}
            </div>
          </div>
        )}

        {/* Sair */}
        <button
          onClick={() => setShowLogout(true)}
          title="Sair"
          aria-label="Sair"
          style={{
            width: 30, height: 30, borderRadius: 7,
            border: 'none', background: 'transparent',
            color: 'var(--color-text-3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-red-light)'
            e.currentTarget.style.color = 'var(--color-red-mid)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-3)'
          }}
        >
          ⏻
        </button>
      </div>

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

// ─── SquadSelector ───────────────────────────────────────────────────────────

function SquadSelector({ expanded }: { expanded: boolean }) {
  const { squads, activeSquadId, setActiveSquad } = useActiveSquadStore()
  const globalRole = useAuthStore((s) => s.profile?.global_role)
  const isPrivileged = globalRole === 'admin' || globalRole === 'gerente'

  if (squads.length === 0) return null

  const activeSquad = squads.find((s) => s.id === activeSquadId)

  if (!expanded) {
    // Colapsado: dot colorido com tooltip
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <div
          title={activeSquad?.name ?? 'Squad'}
          style={{
            width: 28, height: 28, borderRadius: 7,
            background: activeSquad?.color ? `${activeSquad.color}18` : 'var(--color-surface-2)',
            border: `2px solid ${activeSquad?.color ?? 'var(--color-border-md)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800,
            color: activeSquad?.color ?? 'var(--color-text-3)',
          }}
        >
          {(activeSquad?.name ?? 'S')[0].toUpperCase()}
        </div>
      </div>
    )
  }

  // Expandido: select estilizado
  return (
    <div style={{ padding: '2px 10px 4px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px',
        background: activeSquad?.color ? `${activeSquad.color}08` : 'var(--color-surface-2)',
        border: `1px solid ${activeSquad?.color ? activeSquad.color + '30' : 'var(--color-border)'}`,
        borderRadius: 8,
        transition: 'all 0.15s',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: activeSquad?.color ?? 'var(--color-text-3)',
          flexShrink: 0,
        }} />
        <select
          value={activeSquadId ?? ''}
          onChange={(e) => { if (e.target.value) setActiveSquad(e.target.value) }}
          aria-label="Selecionar squad"
          style={{
            flex: 1, fontSize: 12, fontWeight: 600,
            border: 'none', background: 'transparent',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family-sans)',
            cursor: 'pointer', outline: 'none',
            appearance: 'none',
            padding: 0,
            minWidth: 0,
          }}
        >
          {isPrivileged && <option value="all">Todos os squads</option>}
          {squads.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 1l4 4 4-4" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const COLLAPSED_W = 56
const EXPANDED_W = 200

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const isSprints = location.pathname.startsWith('/sprints')
  const isSquads  = location.pathname.startsWith('/squads')
  const isStatusReport = location.pathname.startsWith('/status-report')
  const isReleases = location.pathname.startsWith('/releases')

  return (
    <aside
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        flexShrink: 0,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        padding: '12px 0', gap: 2,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10,
        padding: expanded ? '0 12px' : '0',
        marginBottom: 12,
        justifyContent: expanded ? 'flex-start' : 'center',
      }}>
        <button
          onClick={() => navigate('/')}
          title="Início"
          style={{
            width: 32, height: 32, background: 'var(--color-blue-text)',
            borderRadius: 9, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14,
            flexShrink: 0, letterSpacing: '-0.5px',
            border: 'none', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          TS
        </button>
        {expanded && (
          <span style={{
            fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            ToStatos
          </span>
        )}
      </div>

      {/* Separator */}
      <div style={{
        width: expanded ? 'calc(100% - 24px)' : 28,
        height: 1, background: 'var(--color-border)',
        margin: '6px auto',
      }} />

      {/* Nav items */}
      <NavItem icon={<IconHome />} label="Início" active={location.pathname === '/'} expanded={expanded} onClick={() => navigate('/')} />
      <NavItem icon={<IconStatusReport />} label="Status Report" active={isStatusReport} expanded={expanded} onClick={() => navigate('/status-report')} />
      <NavItem icon={<IconSprints />} label="Cobertura QA" active={isSprints} expanded={expanded} onClick={() => navigate('/sprints')} />
      <NavItem icon={<IconReleases />} label="Releases" active={isReleases} expanded={expanded} onClick={() => navigate('/releases')} />

      <div style={{ flex: 1 }} />

      {/* Separator */}
      <div style={{
        width: expanded ? 'calc(100% - 24px)' : 28,
        height: 1, background: 'var(--color-border)',
        margin: '4px auto',
      }} />

      {/* Nav items — administrativo */}
      <NavItem icon={<IconSquads />} label="Cadastros"  active={isSquads}  expanded={expanded} onClick={() => navigate('/squads')} />
      <NavItem icon={<IconDocs />} label="Documentação" active={location.pathname === '/docs'} expanded={expanded} onClick={() => navigate('/docs')} />

      {/* Toggle button */}
      <div style={{
        width: expanded ? 'calc(100% - 24px)' : 28,
        height: 1, background: 'var(--color-border)',
        margin: '4px auto',
      }} />
      <button
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Recolher menu' : 'Expandir menu'}
        style={{
          width: expanded ? 'calc(100% - 16px)' : 36,
          height: 30, borderRadius: 7,
          border: 'none', background: 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: expanded ? 'flex-end' : 'center',
          padding: expanded ? '0 10px' : 0,
          color: 'var(--color-text-3)',
          transition: 'background 0.15s, color 0.15s, width 0.2s',
          flexShrink: 0,
          alignSelf: expanded ? 'stretch' : 'center',
          margin: expanded ? '0 8px' : 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-2)'
          e.currentTarget.style.color = 'var(--color-text-2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-3)'
        }}
      >
        <IconChevron direction={expanded ? 'left' : 'right'} />
      </button>
    </aside>
  )
}
