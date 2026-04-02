import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { exportToImage, exportJSON, importFromJSON } from '@/modules/sprints/services/exportService'
import { getMasterIndex, concludeSprint, reactivateSprint } from '@/modules/sprints/services/persistence'
import { TermoConclusaoModal } from '@/app/components/TermoConclusaoModal'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
import { useAuthStore } from '@/modules/auth/store/authStore'

// ─── UserMenu (top-right avatar + dropdown) ─────────────────────────────────

function UserMenu() {
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

  return (
    <div ref={menuRef} style={{ position: 'relative', marginLeft: 8 }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu da conta"
        aria-expanded={open}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: open ? '#d0e8f9' : 'var(--color-blue-light)',
          color: 'var(--color-blue)',
          border: open ? '2px solid #7ab8e8' : '2px solid #B5D4F4',
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
        <div style={{
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
                border: '2px solid #B5D4F4',
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
            <MenuButton
              icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/></svg>}
              label="Alterar senha"
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
          <div style={{
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
                border: '2px solid #B5D4F4',
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

// ─── Topbar ──────────────────────────────────────────────────────────────────

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ sprintId?: string }>()
  const sprintTitle = useSprintStore((s) => s.state?.config?.title)
  const sprintState = useSprintStore((s) => s.state)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [showTermo, setShowTermo] = useState(false)
  const [isConcluida, setIsConcluida] = useState(false)
  const [showConfirmConcluir, setShowConfirmConcluir] = useState(false)

  const globalRole = useAuthStore((s) => s.profile?.global_role)
  const { squads: allSquads, activeSquadId, setActiveSquad, loadSquads } = useActiveSquadStore()
  const squads = allSquads.filter((s) => !s.archived)
  const isPrivileged = globalRole === 'admin' || globalRole === 'gerente'

  useEffect(() => { loadSquads() }, []) // eslint-disable-line

  useEffect(() => {
    if (!params.sprintId) return
    const index = getMasterIndex()
    const entry = index.find((s) => s.id === params.sprintId)
    setIsConcluida(entry?.status === 'concluida')
  }, [params.sprintId])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const newId = await importFromJSON(file)
      navigate(`/sprints/${newId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao importar sprint.')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function handleConcluir() {
    if (!params.sprintId) return
    concludeSprint(params.sprintId)
    setIsConcluida(true)
    setShowConfirmConcluir(false)
  }

  function handleReativar() {
    if (!params.sprintId) return
    reactivateSprint(params.sprintId)
    setIsConcluida(false)
  }

  const isDashboard = location.pathname.startsWith('/sprints/') && !!params.sprintId
  const isHome = location.pathname === '/'
  const isStatusReport = location.pathname.startsWith('/status-report')
  const isSquads = location.pathname.startsWith('/squads')
  const isDocs = location.pathname === '/docs'
  const isProfile = location.pathname === '/profile'
  const isChangePassword = location.pathname === '/change-password'

  function getBreadcrumb(): { label: string; path?: string }[] {
    if (isHome) return [{ label: 'Início' }]
    if (isDashboard && sprintTitle) return [{ label: 'Cobertura QA', path: '/sprints' }, { label: sprintTitle }]
    if (location.pathname === '/sprints' || location.pathname === '/sprints/compare') return [{ label: 'Cobertura QA' }]
    if (isStatusReport) return [{ label: 'Status Report' }]
    if (isSquads) return [{ label: 'Cadastros' }]
    if (isDocs) return [{ label: 'Documentação' }]
    if (isProfile) return [{ label: 'Perfil' }]
    if (isChangePassword) return [{ label: 'Alterar Senha' }]
    return [{ label: 'Sprints', path: '/sprints' }]
  }

  const crumbs = getBreadcrumb()

  return (
    <header style={headerStyle}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)' }}>
        {crumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ opacity: 0.35 }}>/</span>}
            {crumb.path ? (
              <span
                onClick={() => navigate(crumb.path!)}
                style={{ cursor: 'pointer', fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-2)')}
              >
                {crumb.label}
              </span>
            ) : (
              <span style={{ color: i === crumbs.length - 1 ? 'var(--color-text)' : 'var(--color-text-2)', fontWeight: 500 }}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* User menu — canto superior direito */}
      <UserMenu />

      {/* Ações contextuais */}
      {isDashboard && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

          {/* 1. Voltar — ghost */}
          <BtnGhost onClick={() => navigate('/sprints')}>← Voltar</BtnGhost>

          {/* Separador */}
          <div style={{ width: 1, height: 20, background: 'var(--color-border)', opacity: 0.5, margin: '0 4px' }} />

          {/* 2. Exportar dashboard — filled-secondary */}
          <BtnSecondary onClick={() => exportToImage()}>↑ Gerar relatório da sprint</BtnSecondary>

          {/* 3. JSON btn-group */}
          <div style={btnGroupWrapper}>
            <BtnGroupItem
              onClick={() => sprintState && exportJSON(sprintState)}
              title="Exportar JSON"
              position="left"
            >
              ↑ Exportar
            </BtnGroupItem>
            <BtnGroupItem
              as="label"
              title="Importar JSON"
              position="right"
            >
              ↓ Importar
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </BtnGroupItem>
          </div>

          {/* 4. Termo de conclusão — outline discreto */}
          <BtnOutlineSubtle onClick={() => setShowTermo(true)}>
            📋 Termo de conclusão
          </BtnOutlineSubtle>

          {/* 5. Concluir / Reativar */}
          {isConcluida ? (
            <BtnOutlineSubtle onClick={handleReativar} title="Reativar esta sprint">
              ↩ Reativar sprint
            </BtnOutlineSubtle>
          ) : (
            <BtnFilledPrimary onClick={() => setShowConfirmConcluir(true)} title="Marcar esta sprint como concluída">
              ✓ Concluir sprint
            </BtnFilledPrimary>
          )}

        </div>
      )}

      {showTermo && <TermoConclusaoModal onClose={() => setShowTermo(false)} />}

      {/* Modal: confirmar conclusão */}
      {showConfirmConcluir && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowConfirmConcluir(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Concluir Sprint
              </h2>
              <button
                onClick={() => setShowConfirmConcluir(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--color-text-2)', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 20 }}>
              Deseja marcar esta sprint como <strong>concluída</strong>? Ela será movida para a seção de sprints encerradas.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowConfirmConcluir(false)}
                style={modalBtnCancel}
              >
                Cancelar
              </button>
              <BtnFilledPrimary onClick={handleConcluir}>
                ✓ Confirmar conclusão
              </BtnFilledPrimary>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function BtnGhost({ children, onClick, title }: React.PropsWithChildren<{ onClick?: () => void; title?: string }>) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...btnBase,
        background: hovered ? 'var(--color-bg)' : 'transparent',
        color: 'var(--color-text-2)',
        border: 'none',
      }}
    >
      {children}
    </button>
  )
}

function BtnSecondary({ children, onClick, title }: React.PropsWithChildren<{ onClick?: () => void; title?: string }>) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...btnBase,
        background: hovered ? 'var(--color-border)' : 'var(--color-bg)',
        color: 'var(--color-text)',
        border: '0.5px solid var(--color-border)',
      }}
    >
      {children}
    </button>
  )
}

function BtnOutlineSubtle({ children, onClick, title }: React.PropsWithChildren<{ onClick?: () => void; title?: string }>) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...btnBase,
        background: hovered ? 'var(--color-bg)' : 'transparent',
        color: 'var(--color-text-2)',
        border: '0.5px solid var(--color-border)',
      }}
    >
      {children}
    </button>
  )
}

function BtnFilledPrimary({ children, onClick, title }: React.PropsWithChildren<{ onClick?: () => void; title?: string }>) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...btnBase,
        background: hovered ? '#1a6bbf' : 'var(--color-blue)',
        color: '#fff',
        border: 'none',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}

type BtnGroupItemProps = React.PropsWithChildren<{
  onClick?: () => void
  title?: string
  position: 'left' | 'right'
  as?: 'button' | 'label'
}>

function BtnGroupItem({ children, onClick, title, position, as: Tag = 'button' }: BtnGroupItemProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <Tag
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...btnBase,
        background: hovered ? 'var(--color-border)' : 'var(--color-bg)',
        color: 'var(--color-text)',
        border: 'none',
        ...(position === 'left'
          ? { borderRadius: '8px 0 0 8px', borderRight: '0.5px solid var(--color-border)' }
          : { borderRadius: '0 8px 8px 0' }),
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none' as const,
      }}
    >
      {children}
    </Tag>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  height: 52,
  background: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  flexShrink: 0,
}

const btnBase: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-family-sans)',
  cursor: 'pointer',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  transition: 'background 0.12s',
}

const btnGroupWrapper: React.CSSProperties = {
  display: 'inline-flex',
  border: '0.5px solid var(--color-border)',
  borderRadius: 8,
  overflow: 'hidden',
}

const modalBtnCancel: React.CSSProperties = {
  padding: '7px 16px',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}
