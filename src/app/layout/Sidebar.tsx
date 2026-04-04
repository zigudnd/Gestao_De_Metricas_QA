import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

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
