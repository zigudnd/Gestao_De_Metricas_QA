import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { exportToImage, exportJSON, importFromJSON } from '@/modules/sprints/services/exportService'
import { getMasterIndex, concludeSprint, reactivateSprint } from '@/modules/sprints/services/persistence'
import { TermoConclusaoModal } from '@/app/components/TermoConclusaoModal'
import { UserMenu } from '@/app/components/UserMenu'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
import { useAuthStore } from '@/modules/auth/store/authStore'

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
  const isReleases = location.pathname.startsWith('/releases')
  const isSquads = location.pathname.startsWith('/squads')
  const isDocs = location.pathname === '/docs'
  const isProfile = location.pathname === '/profile'
  const isChangePassword = location.pathname === '/change-password'

  function getBreadcrumb(): { label: string; path?: string }[] {
    const home = { label: 'Início', path: '/' }
    if (isHome) return [{ label: 'Início' }]
    if (isDashboard && sprintTitle) return [home, { label: 'Cobertura QA', path: '/sprints' }, { label: sprintTitle }]
    if (location.pathname === '/sprints' || location.pathname === '/sprints/compare') return [home, { label: 'Cobertura QA' }]
    if (isStatusReport) return [home, { label: 'Status Report' }]
    if (isReleases) return [home, { label: 'Releases' }]
    if (isSquads) return [home, { label: 'Cadastros' }]
    if (isDocs) return [home, { label: 'Documentação' }]
    if (isProfile) return [home, { label: 'Perfil' }]
    if (isChangePassword) return [home, { label: 'Alterar Senha' }]
    return [{ label: 'Início' }]
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
        background: hovered ? 'var(--color-blue-text)' : 'var(--color-blue)',
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
