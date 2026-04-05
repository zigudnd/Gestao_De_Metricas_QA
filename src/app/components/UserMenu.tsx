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
    ? { label: 'Admin', cls: 'badge badge-red' }
    : globalRole === 'gerente'
    ? { label: 'Gerente', cls: 'badge badge-amber' }
    : null

  const activeSquad = squads.find((s) => s.id === activeSquadId)

  return (
    <div ref={menuRef} className="relative ml-2 flex items-center gap-[10px]">
      {/* Squad label */}
      {activeSquad && (
        <div className="flex items-center gap-[6px] shrink-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: activeSquad.color ?? 'var(--color-blue)' }}
          />
          <span className="text-[12px] font-semibold text-text-2 whitespace-nowrap">
            {activeSquad.name}
          </span>
        </div>
      )}

      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu da conta"
        aria-expanded={open}
        className="w-[34px] h-[34px] rounded-full bg-blue-light text-blue flex items-center justify-center text-[13px] font-bold cursor-pointer shrink-0 tracking-tight transition-all"
        style={{
          border: open ? '2px solid var(--color-blue)' : '2px solid var(--color-border)',
        }}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[42px] right-0 w-[280px] max-w-[90vw] bg-surface border border-border rounded-[12px] shadow-xl z-[2000] overflow-hidden anim-fade-up">
          {/* User info header */}
          <div className="p-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-full bg-blue-light text-blue border-2 border-border flex items-center justify-center text-[17px] font-bold shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap">
                  {profile?.display_name ?? '—'}
                </div>
                <div className="text-[12px] text-text-3 overflow-hidden text-ellipsis whitespace-nowrap">
                  {profile?.email ?? ''}
                </div>
                {roleBadge && (
                  <span className={`${roleBadge.cls} mt-1`}>
                    {roleBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Squad selector */}
          {squads.length > 0 && (
            <div className="px-4 py-[10px] border-b border-border">
              <div className="section-label !mb-[6px]">
                Squad ativo
              </div>
              <select
                value={activeSquadId ?? ''}
                onChange={(e) => { if (e.target.value) setActiveSquad(e.target.value) }}
                aria-label="Selecionar squad"
                className="select-field font-semibold"
              >
                {isPrivileged && <option value="all">Todos os squads</option>}
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Menu items */}
          <div className="py-[6px]">
            <MenuButton
              icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3"/><path d="M2.5 14c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/></svg>}
              label="Meu perfil"
              onClick={() => { navigate('/profile'); setOpen(false) }}
            />
            <div className="h-px bg-border mx-3 my-1" />
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
          className="modal-backdrop modal-backdrop-high"
          style={{ zIndex: 3000 }}
        >
          <div
            className="modal-container modal-sm"
            style={{ borderTop: '3px solid var(--color-blue)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-light text-blue border-2 border-border flex items-center justify-center text-[16px] font-bold shrink-0">
                {initial}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-text">
                  {profile?.display_name ?? '—'}
                </div>
                <div className="text-small">
                  {profile?.email ?? ''}
                </div>
              </div>
            </div>
            <p className="text-body mb-5">
              Deseja sair da sua conta?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowLogout(false)}
                className="btn btn-outline btn-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogout(false); signOut() }}
                className="btn btn-primary btn-md"
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
      onClick={onClick}
      className="w-full flex items-center gap-[10px] px-4 py-[9px] bg-transparent border-none cursor-pointer text-[13px] font-medium transition-colors duration-[120ms] hover:bg-surface-2"
      style={{
        color: danger ? 'var(--color-red)' : 'var(--color-text)',
      }}
      onMouseEnter={(e) => {
        if (danger) e.currentTarget.style.background = 'var(--color-red-light)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span className="shrink-0 flex">{icon}</span>
      {label}
    </button>
  )
}
