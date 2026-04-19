import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { exportToImage, exportJSON, importFromJSON } from '@/modules/sprints/services/exportService'
import { getMasterIndex, concludeSprint, reactivateSprint } from '@/modules/sprints/services/persistence'
import { TermoConclusaoModal } from '@/app/components/TermoConclusaoModal'
import { UserMenu } from '@/app/components/UserMenu'

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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!params.sprintId) return
    const index = getMasterIndex()
    const entry = index.find((s) => s.id === params.sprintId)
    setIsConcluida(entry?.status === 'concluida')
  }, [params.sprintId])

  // Close "Mais ações" on outside click
  useEffect(() => {
    if (!moreMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreMenuOpen])

  // Close "Mais ações" on Escape
  useEffect(() => {
    if (!moreMenuOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [moreMenuOpen])

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
  const isReleases = location.pathname.startsWith('/releases')
  const isSquads = location.pathname.startsWith('/squads')
  const isPRs = location.pathname === '/prs'
  const isDocs = location.pathname === '/docs'
  const isProfile = location.pathname === '/profile'
  const isChangePassword = location.pathname === '/change-password'

  function getBreadcrumb(): { label: string; path?: string }[] {
    const home = { label: 'Início', path: '/' }
    if (isHome) return [{ label: 'Início' }]
    if (isDashboard && sprintTitle) return [home, { label: 'Cobertura QA', path: '/sprints' }, { label: sprintTitle }]
    if (location.pathname === '/sprints' || location.pathname === '/sprints/compare') return [home, { label: 'Cobertura QA' }]
    if (isStatusReport) {
      const isDetail = location.pathname.match(/^\/status-report\/[^/]+$/)
      if (isDetail) return [home, { label: 'Status Report', path: '/status-report' }, { label: 'Editando Report' }]
      return [home, { label: 'Status Report' }]
    }
    if (isReleases) {
      const isDetail = location.pathname.match(/^\/releases\/[^/]+$/)
      if (isDetail) return [home, { label: 'Releases', path: '/releases' }, { label: 'Dashboard Release' }]
      return [home, { label: 'Releases' }]
    }
    if (isPRs) return [home, { label: 'Gestão de PRs' }]
    if (isSquads) return [home, { label: 'Cadastros' }]
    if (isDocs) return [home, { label: 'Documentação' }]
    if (isProfile) return [home, { label: 'Perfil' }]
    if (isChangePassword) return [home, { label: 'Alterar Senha' }]
    return [{ label: 'Início' }]
  }

  const crumbs = getBreadcrumb()

  function handleMenuAction(fn: () => void) {
    setMoreMenuOpen(false)
    fn()
  }

  return (
    <header style={headerStyle}>
      {/* Breadcrumb */}
      <nav aria-label="Navegação" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)' }}>
        {crumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span aria-hidden="true" style={{ opacity: 0.35 }}>/</span>}
            {crumb.path ? (
              <span
                role="link"
                tabIndex={0}
                onClick={() => navigate(crumb.path!)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(crumb.path!) }}
                className="topbar-breadcrumb-link"
                style={{ cursor: 'pointer', fontWeight: 500, transition: 'color 0.15s' }}
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

      {/* Ações contextuais */}
      {isDashboard && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* 1. Voltar — ghost */}
          <BtnGhost onClick={() => navigate('/sprints')} aria-label="Voltar para lista de sprints">
            <IconArrowLeft /> Voltar
          </BtnGhost>

          {/* Separador */}
          <div style={dividerStyle} />

          {/* 2. Mais ações — dropdown */}
          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <BtnOutlineSubtle
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              aria-label="Mais ações"
            >
              <IconMoreHorizontal /> Mais ações
            </BtnOutlineSubtle>

            {moreMenuOpen && (
              <div role="menu" style={menuStyle}>
                <div style={menuLabelStyle}>Relatórios</div>
                <button
                  role="menuitem"
                  className="topbar-menu-item"
                  style={menuItemStyle}
                  onClick={() => handleMenuAction(() => exportToImage())}
                >
                  <IconFileText /> Gerar relatório
                </button>

                <div style={menuSepStyle} />
                <div style={menuLabelStyle}>JSON</div>
                <button
                  role="menuitem"
                  className="topbar-menu-item"
                  style={menuItemStyle}
                  onClick={() => handleMenuAction(() => sprintState && exportJSON(sprintState))}
                >
                  <IconUpload /> Exportar JSON
                </button>
                <label
                  role="menuitem"
                  className="topbar-menu-item"
                  style={{ ...menuItemStyle, cursor: 'pointer' }}
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <IconDownload /> Importar JSON
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImport}
                  />
                </label>

                <div style={menuSepStyle} />
                <button
                  role="menuitem"
                  className="topbar-menu-item"
                  style={menuItemStyle}
                  onClick={() => handleMenuAction(() => setShowTermo(true))}
                >
                  <IconClipboardCheck /> Termo de conclusão
                </button>
              </div>
            )}
          </div>

          {/* 3. Concluir / Reativar */}
          {isConcluida ? (
            <BtnOutlineSubtle onClick={handleReativar} title="Reativar esta sprint">
              <IconRotateCcw /> Reativar sprint
            </BtnOutlineSubtle>
          ) : (
            <BtnFilledPrimary onClick={() => setShowConfirmConcluir(true)} title="Marcar esta sprint como concluída">
              <IconCheck /> Concluir sprint
            </BtnFilledPrimary>
          )}

          {/* Separador antes do UserMenu */}
          <div style={dividerStyle} />

        </div>
      )}

      {/* User menu — canto superior direito (sempre último) */}
      <UserMenu />

      {showTermo && <TermoConclusaoModal onClose={() => setShowTermo(false)} />}

      {/* Modal: confirmar conclusão */}
      {showConfirmConcluir && (
        <div
          onClick={() => setShowConfirmConcluir(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Concluir Sprint" style={{
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
                aria-label="Fechar"
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
                <IconCheck /> Confirmar conclusão
              </BtnFilledPrimary>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .topbar-breadcrumb-link:hover { color: var(--color-text) !important; }
        .topbar-btn-ghost:hover { background: var(--color-bg) !important; color: var(--color-text) !important; }
        .topbar-btn-secondary:hover { background: var(--color-border) !important; }
        .topbar-btn-outline:hover { background: var(--color-bg) !important; color: var(--color-text) !important; }
        .topbar-btn-primary:hover { background: var(--color-blue-text) !important; }
        .topbar-menu-item:hover { background: var(--color-bg) !important; }
      `}</style>
    </header>
  )
}

// ─── Icon components (SVG inline, Lucide paths) ──────────────────────────────

type IconProps = { size?: number }

function Svg({ size = 14, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  )
}

function IconArrowLeft(props: IconProps) {
  return <Svg {...props}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>
}
function IconMoreHorizontal(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Svg>
}
function IconCheck(props: IconProps) {
  return <Svg {...props}><polyline points="20 6 9 17 4 12" /></Svg>
}
function IconRotateCcw(props: IconProps) {
  return <Svg {...props}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></Svg>
}
function IconFileText(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </Svg>
  )
}
function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Svg>
  )
}
function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  )
}
function IconClipboardCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" />
      <path d="m9 14 2 2 4-4" />
    </Svg>
  )
}

// ─── Micro-components ─────────────────────────────────────────────────────────

type BtnProps = React.PropsWithChildren<{
  onClick?: () => void
  title?: string
  'aria-label'?: string
  'aria-haspopup'?: 'menu'
  'aria-expanded'?: boolean
}>

function BtnGhost(props: BtnProps) {
  return (
    <button
      onClick={props.onClick}
      title={props.title}
      aria-label={props['aria-label']}
      className="topbar-btn-ghost"
      style={{
        ...btnBase,
        background: 'transparent',
        color: 'var(--color-text-2)',
        border: 'none',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {props.children}
    </button>
  )
}

function BtnOutlineSubtle(props: BtnProps) {
  return (
    <button
      onClick={props.onClick}
      title={props.title}
      aria-label={props['aria-label']}
      aria-haspopup={props['aria-haspopup']}
      aria-expanded={props['aria-expanded']}
      className="topbar-btn-outline"
      style={{
        ...btnBase,
        background: 'transparent',
        color: 'var(--color-text-2)',
        border: '0.5px solid var(--color-border)',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {props.children}
    </button>
  )
}

function BtnFilledPrimary(props: BtnProps) {
  return (
    <button
      onClick={props.onClick}
      title={props.title}
      aria-label={props['aria-label']}
      className="topbar-btn-primary"
      style={{
        ...btnBase,
        background: 'var(--color-blue)',
        color: '#fff',
        border: 'none',
        fontWeight: 600,
        transition: 'background 0.12s',
      }}
    >
      {props.children}
    </button>
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
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

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'var(--color-border)',
  opacity: 0.7,
  margin: '0 2px',
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
  minWidth: 240,
  padding: 6,
  zIndex: 500,
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  width: '100%',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text)',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s',
}

const menuLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '6px 10px 2px',
}

const menuSepStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--color-border)',
  margin: '4px 2px',
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
