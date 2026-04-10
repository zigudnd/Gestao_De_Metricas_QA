import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
import { useAuthStore } from '@/modules/auth/store/authStore'

// ─── UserMenu (top-right avatar + dropdown) ─────────────────────────────────

export function UserMenu() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { squads, activeSquadId, setActiveSquad } = useActiveSquadStore()
  const globalRole = profile?.global_role
  const isPrivileged = globalRole === 'admin' || globalRole === 'gerente'
  const [open, setOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const initial = (profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fechar com Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  const roleBadge = globalRole === 'admin'
    ? { label: 'Admin', bg: 'var(--color-red-light)', color: 'var(--color-red)' }
    : globalRole === 'gerente'
    ? { label: 'Gerente', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' }
    : null

  const activeSquad = squads.find((s) => s.id === activeSquadId)

  return (
    <div ref={menuRef} style={{ position: 'relative', marginLeft: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Squad label */}
      {activeSquad && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: activeSquad.color ?? 'var(--color-blue)',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
            whiteSpace: 'nowrap',
          }}>
            {activeSquad.name}
          </span>
        </div>
      )}

      {/* Avatar button */}
      <button
        id="user-menu-button"
        onClick={() => setOpen(!open)}
        aria-label="Menu da conta"
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: open ? 'var(--color-blue-light)' : 'var(--color-blue-light)',
          color: 'var(--color-blue)',
          border: open ? '2px solid var(--color-blue)' : '2px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          flexShrink: 0, letterSpacing: '-0.5px',
          transition: 'all 0.15s',
        }}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-labelledby="user-menu-button"
          style={{
          position: 'absolute', top: 42, right: 0,
          width: 280, maxWidth: '90vw',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 2000,
          overflow: 'hidden',
          animation: 'fadeUp 0.15s ease both',
        }}>
          {/* User info header */}
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'var(--color-blue-light)', color: 'var(--color-blue)',
                border: '2px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 700, flexShrink: 0,
              }}>
                {initial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {profile?.display_name ?? '—'}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--color-text-3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {profile?.email ?? ''}
                </div>
                {roleBadge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                    background: roleBadge.bg, color: roleBadge.color,
                    display: 'inline-block', marginTop: 4,
                  }}>
                    {roleBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Squad selector */}
          {squads.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
              }}>
                Squad ativo
              </div>
              <select
                value={activeSquadId ?? ''}
                onChange={(e) => { if (e.target.value) setActiveSquad(e.target.value) }}
                aria-label="Selecionar squad"
                style={{
                  width: '100%', padding: '7px 28px 7px 10px', fontSize: 13, fontWeight: 600,
                  border: '1px solid var(--color-border-md)', borderRadius: 7,
                  background: 'var(--color-surface)', color: 'var(--color-text)',
                  fontFamily: 'var(--font-family-sans)', cursor: 'pointer',
                  appearance: 'none', outline: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                }}
              >
                {isPrivileged && <option value="all">Todos os squads</option>}
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            <MenuButton
              icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3"/><path d="M2.5 14c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/></svg>}
              label="Meu perfil"
              onClick={() => { navigate('/profile'); setOpen(false) }}
            />
            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 12px' }} />
            <MenuButton
              icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2"/><path d="M10 12l4-4-4-4"/><path d="M14 8H6"/></svg>}
              label="Sair"
              danger
              onClick={() => { setOpen(false); setShowLogout(true) }}
            />
          </div>
        </div>
      )}

      {/* Logout confirmation */}
      {showLogout && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowLogout(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 3000,
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Confirmar logout" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-blue)',
            borderRadius: 12, padding: '24px 22px',
            width: 340, maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--color-blue-light)', color: 'var(--color-blue)',
                border: '2px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, flexShrink: 0,
              }}>
                {initial}
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
                onClick={() => setShowLogout(false)}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: '1px solid var(--color-border-md)',
                  borderRadius: 7, fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-2)', fontFamily: 'var(--font-family-sans)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogout(false); signOut() }}
                style={{
                  padding: '8px 16px', background: 'var(--color-blue)',
                  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-family-sans)',
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuButton({ icon, label, onClick, danger }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 500,
        color: danger ? 'var(--color-red)' : 'var(--color-text)',
        fontFamily: 'var(--font-family-sans)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--color-red-light)' : 'var(--color-surface-2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none'
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      {label}
    </button>
  )
}
