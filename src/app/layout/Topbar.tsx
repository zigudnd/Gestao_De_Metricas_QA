import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { exportToImage, exportJSON } from '@/modules/sprints/services/exportService'

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ sprintId?: string }>()
  const sprintTitle = useSprintStore((s) => s.state?.config?.title)
  const sprintState = useSprintStore((s) => s.state)

  const isDashboard = location.pathname.startsWith('/sprints/') && !!params.sprintId

  return (
    <header
      style={{
        height: 48,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)' }}>
        <span
          onClick={() => navigate('/sprints')}
          style={{ cursor: 'pointer', fontWeight: 500 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-2)')}
        >
          Sprints
        </span>
        {isDashboard && sprintTitle && (
          <>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{sprintTitle}</span>
          </>
        )}
      </nav>

      {/* Ações contextuais */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!isDashboard && (
          <button
            className="btn-primary-sm"
            onClick={() => {
              const el = document.getElementById('create-sprint-trigger')
              el?.click()
            }}
            style={btnPrimary}
          >
            + Nova sprint
          </button>
        )}
        {isDashboard && (
          <>
            <button onClick={() => navigate('/sprints')} style={btnOutline}>
              ← Voltar
            </button>
            <button
              onClick={() => { exportToImage() }}
              style={btnOutline}
            >
              📸 Exportar PNG
            </button>
            <button
              onClick={() => sprintState && exportJSON(sprintState)}
              style={btnOutline}
            >
              💾 Exportar JSON
            </button>
          </>
        )}
      </div>
    </header>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

const btnOutline: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 7,
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}
