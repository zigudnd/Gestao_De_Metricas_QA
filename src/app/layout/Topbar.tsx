import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSprintStore } from '@/modules/sprints/store/sprintStore'
import { exportToImage, exportJSON, importFromJSON } from '@/modules/sprints/services/exportService'
import { getMasterIndex, concludeSprint, reactivateSprint } from '@/modules/sprints/services/persistence'
import { TermoConclusaoModal } from '@/app/components/TermoConclusaoModal'

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
              📸 Exportar Dashboard
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

            {isConcluida ? (
              <button
                onClick={handleReativar}
                style={btnOutline}
                title="Reativar esta sprint"
              >
                ↩ Reativar Sprint
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmConcluir(true)}
                style={btnGreen}
                title="Marcar esta sprint como concluída"
              >
                ✅ Concluir Sprint
              </button>
            )}

            <button onClick={() => setShowTermo(true)} style={btnPrimary}>
              📋 Termo de Conclusão
            </button>
          </>
        )}
      </div>

      {showTermo && <TermoConclusaoModal onClose={() => setShowTermo(false)} />}

      {/* Modal inline: confirmar conclusão */}
      {showConfirmConcluir && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowConfirmConcluir(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
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
                style={{
                  padding: '7px 16px',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-md)',
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConcluir}
                style={btnGreen}
              >
                ✅ Confirmar Conclusão
              </button>
            </div>
          </div>
        </div>
      )}
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

const btnGreen: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--color-green)',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}
