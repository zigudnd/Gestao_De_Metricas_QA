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
    if (isSquads) return [home, { label: 'Cadastros' }]
    if (isDocs) return [home, { label: 'Documentação' }]
    if (isProfile) return [home, { label: 'Perfil' }]
    if (isChangePassword) return [home, { label: 'Alterar Senha' }]
    return [{ label: 'Início' }]
  }

  const crumbs = getBreadcrumb()

  return (
    <header className="h-[52px] bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-[6px] text-[13px] text-text-2 pl-1">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-[6px]">
            {i > 0 && <span className="opacity-35">/</span>}
            {crumb.path ? (
              <span
                onClick={() => navigate(crumb.path!)}
                className="cursor-pointer font-medium transition-colors duration-150 hover:text-text"
              >
                {crumb.label}
              </span>
            ) : (
              <span
                className="font-medium"
                style={{ color: i === crumbs.length - 1 ? 'var(--color-text)' : 'var(--color-text-2)' }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Ações contextuais */}
      {isDashboard && (
        <div className="flex items-center gap-2">

          {/* 1. Voltar — ghost */}
          <button onClick={() => navigate('/sprints')} className="btn btn-ghost">← Voltar</button>

          {/* Separador */}
          <div className="w-px h-5 bg-border opacity-50 mx-1" />

          {/* 2. Exportar dashboard — filled-secondary */}
          <button onClick={() => exportToImage()} className="btn btn-outline btn-sm">↑ Gerar relatório da sprint</button>

          {/* 3. JSON btn-group */}
          <div className="inline-flex border border-border rounded-[8px] overflow-hidden">
            <button
              onClick={() => sprintState && exportJSON(sprintState)}
              title="Exportar JSON"
              className="btn btn-sm !rounded-none !rounded-l-[8px] !border-r !border-border"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              ↑ Exportar
            </button>
            <label
              title="Importar JSON"
              className="btn btn-sm !rounded-none !rounded-r-[8px] cursor-pointer"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              ↓ Importar
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </div>

          {/* 4. Termo de conclusão — outline discreto */}
          <button onClick={() => setShowTermo(true)} className="btn btn-outline btn-sm">
            📋 Termo de conclusão
          </button>

          {/* 5. Concluir / Reativar */}
          {isConcluida ? (
            <button onClick={handleReativar} title="Reativar esta sprint" className="btn btn-outline btn-sm">
              ↩ Reativar sprint
            </button>
          ) : (
            <button onClick={() => setShowConfirmConcluir(true)} title="Marcar esta sprint como concluída" className="btn btn-primary btn-sm font-semibold">
              ✓ Concluir sprint
            </button>
          )}

        </div>
      )}

      {/* User menu — canto superior direito (sempre último) */}
      <UserMenu />

      {showTermo && <TermoConclusaoModal onClose={() => setShowTermo(false)} />}

      {/* Modal: confirmar conclusão */}
      {showConfirmConcluir && (
        <div
          onClick={() => setShowConfirmConcluir(false)}
          className="modal-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Concluir Sprint"
            className="modal-container modal-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-md">
                Concluir Sprint
              </h2>
              <button
                onClick={() => setShowConfirmConcluir(false)}
                aria-label="Fechar"
                className="btn btn-ghost text-[20px] leading-none px-1"
              >
                ×
              </button>
            </div>
            <p className="text-body mb-5">
              Deseja marcar esta sprint como <strong>concluída</strong>? Ela será movida para a seção de sprints encerradas.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmConcluir(false)}
                className="btn btn-outline btn-md"
              >
                Cancelar
              </button>
              <button onClick={handleConcluir} className="btn btn-primary btn-md font-semibold">
                ✓ Confirmar conclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
