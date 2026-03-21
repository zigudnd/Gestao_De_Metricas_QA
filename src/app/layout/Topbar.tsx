import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { exportToImage, exportJSON, importFromJSON } from '@/modules/sprints/services/exportService'
import { TermoConclusaoModal } from '@/app/components/TermoConclusaoModal'

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ sprintId?: string }>()
  const sprintTitle = useSprintStore((s) => s.state?.config?.title)
  const sprintState = useSprintStore((s) => s.state)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [showTermo, setShowTermo] = useState(false)

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
            <label title="Importar sprint de arquivo JSON" style={{ ...btnOutline, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
              📥 Importar JSON
              <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
            <button onClick={() => setShowTermo(true)} style={btnPrimary}>
              📋 Termo de Conclusão
            </button>
          </>
        )}
      </div>
      {showTermo && <TermoConclusaoModal onClose={() => setShowTermo(false)} />}
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
