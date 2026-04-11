import { useNavigate } from 'react-router-dom'

export function PRsTabHome() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm text-[var(--color-text-2)]">
        Acesse a Gestão de PRs para visualizar e cadastrar PRs.
      </p>
      <button
        onClick={() => navigate('/prs')}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        style={{ background: 'var(--color-blue)' }}
      >
        Abrir Gestão de PRs
      </button>
    </div>
  )
}
