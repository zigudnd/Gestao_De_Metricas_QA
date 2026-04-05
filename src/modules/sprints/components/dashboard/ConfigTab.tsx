import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSprintStore } from '../../store/sprintStore'
import { upsertSprintInMasterIndex, getMasterIndex } from '../../services/persistence'
import type { SprintConfig } from '../../types/sprint.types'
import { listMySquads, type Squad } from '@/modules/squads/services/squadsService'
import { useReleaseStore } from '@/modules/releases/store/releaseStore'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const ROLE_SUGGESTIONS = ['PO', 'TL', 'Coordenador', 'Gerente', 'Dev Lead', 'Scrum Master', 'Designer', 'Dev']

export function ConfigTab() {
  const state = useSprintStore((s) => s.state)
  const sprintId = useSprintStore((s) => s.sprintId)
  const updateConfig = useSprintStore((s) => s.updateConfig)
  const addResponsible = useSprintStore((s) => s.addResponsible)
  const updateResponsible = useSprintStore((s) => s.updateResponsible)
  const removeResponsible = useSprintStore((s) => s.removeResponsible)

  const lastSaved = useSprintStore((s) => s.lastSaved)

  // Save confirmation indicator
  const [saved, setSaved] = useState(false)
  const initialLoad = useRef(true)

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false
      return
    }
    if (lastSaved > 0) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [lastSaved])

  // Weights accordion
  const [showWeights, setShowWeights] = useState(false)

  const [squads, setSquads] = useState<Squad[]>([])
  const [showSquadChangeModal, setShowSquadChangeModal] = useState(false)
  const [pendingSquadId, setPendingSquadId] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [squadsLoading, setSquadsLoading] = useState(true)

  // Release vinculada
  const { releases: allReleases, load: loadReleases } = useReleaseStore()
  const sprintEntry = getMasterIndex().find((s) => s.id === sprintId)
  const sprintType = sprintEntry?.sprintType || 'squad'
  const currentReleaseId = sprintEntry?.releaseId || ''
  const isLinkedType = sprintType === 'regressivo' || sprintType === 'integrado'

  const [showReleaseChangeModal, setShowReleaseChangeModal] = useState(false)
  const [pendingReleaseId, setPendingReleaseId] = useState('')

  useEffect(() => {
    listMySquads().then(setSquads).catch((e) => { if (import.meta.env.DEV) console.warn('[Sprints] Failed to load squads:', e) }).finally(() => setSquadsLoading(false))
    loadReleases()
  }, []) // eslint-disable-line

  function handleSquadSelectChange(newSquadId: string) {
    if (!newSquadId || newSquadId === sprintEntry?.squadId) return
    setPendingSquadId(newSquadId)
    setConfirmPassword('')
    setConfirmError('')
    setShowSquadChangeModal(true)
  }

  async function handleConfirmSquadChange() {
    if (!confirmPassword.trim()) { setConfirmError('Digite sua senha para confirmar.'); return }
    setConfirming(true)
    setConfirmError('')
    try {
      // Verificar senha com cliente isolado para nao interferir na sessao ativa
      const email = (await supabase.auth.getUser()).data.user?.email
      if (!email) { setConfirmError('Erro ao obter email.'); setConfirming(false); return }
      const verifyClient = createClient(
        import.meta.env.VITE_SUPABASE_URL ?? '',
        import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const { error } = await verifyClient.auth.signInWithPassword({ email, password: confirmPassword })
      if (error) { setConfirmError('Senha incorreta.'); setConfirming(false); return }

      // Aplicar mudanca
      const newSquad = squads.find((s) => s.id === pendingSquadId)
      if (newSquad) {
        updateConfig('squad', newSquad.name)
        // Atualizar squadId no master index
        if (sprintId) {
          upsertSprintInMasterIndex(sprintId, state, pendingSquadId)
        }
      }
      setShowSquadChangeModal(false)
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Sprints] Failed to confirm squad change:', e)
      setConfirmError('Erro ao confirmar. Tente novamente.')
    } finally {
      setConfirming(false)
    }
  }

  function handleReleaseSelectChange(newReleaseId: string) {
    if (newReleaseId === currentReleaseId) return
    setPendingReleaseId(newReleaseId)
    setShowReleaseChangeModal(true)
  }

  function handleConfirmReleaseChange() {
    if (!sprintId) return
    const newRelease = allReleases.find((r) => r.id === pendingReleaseId)
    upsertSprintInMasterIndex(sprintId, state, sprintEntry?.squadId, {
      sprintType,
      releaseId: pendingReleaseId || undefined,
      releaseVersion: newRelease?.version,
    })
    setShowReleaseChangeModal(false)
  }

  function field(key: keyof SprintConfig, type: 'text' | 'number' | 'date' = 'text') {
    const value = state.config[key]
    return (
      <input
        type={type}
        value={String(value ?? '')}
        onChange={(e) => updateConfig(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="input-field"
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {saved && (
        <span className="badge badge-green self-end" style={{ transition: 'opacity 0.3s' }}>
          Salvo &#10003;
        </span>
      )}
      {/* Sprint info */}
      <Card title="Informacoes da Sprint">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <FormGroup label="Titulo">
            <input
              type="text"
              value={state.config.title}
              onChange={(e) => updateConfig('title', e.target.value)}
              className="input-field"
              placeholder="Ex: QA Dashboard — Sprint 12"
            />
          </FormGroup>
          <FormGroup label="Squad / Time">
            <div className="flex items-center gap-2">
              {squadsLoading ? (
                <select disabled className="select-field opacity-60 cursor-not-allowed">
                  <option>Carregando squads...</option>
                </select>
              ) : squads.length > 0 ? (
                <select
                  value={squads.find((s) => s.name === state.config.squad)?.id ?? ''}
                  onChange={(e) => handleSquadSelectChange(e.target.value)}
                  className="select-field"
                >
                  <option value="">— Selecionar squad —</option>
                  {squads.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={state.config.squad}
                  onChange={(e) => updateConfig('squad', e.target.value)}
                  className="input-field"
                  placeholder="Nome do squad"
                />
              )}
            </div>
          </FormGroup>
          {/* Release vinculada — so para regressivo/integrado */}
          {isLinkedType && (
            <FormGroup label={`Release vinculada (${sprintType === 'regressivo' ? 'Regressivo' : 'Integrado'})`}>
              <select
                value={currentReleaseId}
                onChange={(e) => handleReleaseSelectChange(e.target.value)}
                className="select-field"
              >
                <option value="">— Nenhuma release —</option>
                {allReleases
                  .filter((r) => r.status !== 'concluida')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.version} — {r.title}
                    </option>
                  ))}
              </select>
            </FormGroup>
          )}
          <FormGroup label="QA Responsavel">
            {field('qaName')}
          </FormGroup>
          <FormGroup label="Versao Alvo">
            {field('targetVersion')}
          </FormGroup>
          <FormGroup label="Data de Inicio">
            {field('startDate', 'date')}
          </FormGroup>
          <FormGroup label="Data de Fim">
            {field('endDate', 'date')}
          </FormGroup>
          <FormGroup label="Duracao (dias)">
            <input
              type="number"
              value={state.config.sprintDays}
              onChange={(e) => updateConfig('sprintDays', Number(e.target.value))}
              className="input-field"
              min={1}
              placeholder="20"
            />
          </FormGroup>
          <FormGroup label="Fins de semana">
            <label className="flex items-center gap-2.5 cursor-pointer" style={{ paddingTop: 6 }}>
              <input
                type="checkbox"
                checked={!state.config.excludeWeekends}
                onChange={(e) => updateConfig('excludeWeekends', !e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-blue)' }}
              />
              <span className="text-body" style={{ color: 'var(--color-text)' }}>
                Incluir fins de semana na duracao
              </span>
            </label>
          </FormGroup>
        </div>
      </Card>

      {/* Outros Responsaveis */}
      <Card title="Outros Responsaveis">
        <p className="text-body" style={{ marginBottom: 16 }}>
          Adicione os demais responsaveis da sprint (PO, TL, Coordenador, Gerente, etc.).
          Eles aparecerao no Termo de Conclusao.
        </p>
        <datalist id="role-suggestions">
          {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
        </datalist>
        <div className="flex flex-col gap-2" style={{ marginBottom: 12 }}>
          {(state.responsibles ?? []).map((r, i) => (
            <div key={r.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '160px 1fr 32px' }}>
              <input
                type="text"
                list="role-suggestions"
                placeholder="Cargo (ex: PO)"
                value={r.role}
                onChange={(e) => updateResponsible(i, 'role', e.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Nome completo"
                value={r.name}
                onChange={(e) => updateResponsible(i, 'name', e.target.value)}
                className="input-field"
              />
              <button
                onClick={() => removeResponsible(i)}
                title="Remover"
                aria-label="Remover responsavel"
                className="btn-ghost"
                style={{ fontSize: 16, lineHeight: 1 }}
              >✕</button>
            </div>
          ))}
        </div>
        <button
          onClick={addResponsible}
          aria-label="Adicionar responsavel"
          className="btn btn-outline btn-md"
          style={{ border: '1px dashed var(--color-border-md)' }}
        >
          + Adicionar responsavel
        </button>
      </Card>

      {/* Advanced weights accordion */}
      <button
        onClick={() => setShowWeights(!showWeights)}
        aria-label={showWeights ? 'Ocultar pesos avancados' : 'Mostrar configuracoes avancadas'}
        aria-expanded={showWeights}
        className="btn-ghost self-start"
        style={{ marginTop: 8, color: 'var(--color-blue-text)', fontWeight: 600 }}
      >
        <span style={{
          display: 'inline-block', transition: 'transform 0.15s',
          transform: showWeights ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: 10,
        }}>&#9654;</span>
        {showWeights ? 'Ocultar pesos avancados' : 'Configuracoes avancadas (Health Score e Impacto Prevenido)'}
      </button>

      {showWeights && (<>
      {/* Health Score */}
      <Card title="Health Score — Pesos das Penalidades">
        <p className="text-body" style={{ marginBottom: 16 }}>
          Configura o quanto cada evento desconta do Health Score (base 100).
        </p>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <FormGroup label="Bug Critico">
            <input type="number" min={0} value={state.config.hsCritical} onChange={(e) => updateConfig('hsCritical', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Bug Alto">
            <input type="number" min={0} value={state.config.hsHigh} onChange={(e) => updateConfig('hsHigh', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Bug Medio">
            <input type="number" min={0} value={state.config.hsMedium} onChange={(e) => updateConfig('hsMedium', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Bug Baixo">
            <input type="number" min={0} value={state.config.hsLow} onChange={(e) => updateConfig('hsLow', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Reteste">
            <input type="number" min={0} value={state.config.hsRetest} onChange={(e) => updateConfig('hsRetest', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Tela Bloqueada">
            <input type="number" min={0} value={state.config.hsBlocked} onChange={(e) => updateConfig('hsBlocked', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Caso em Atraso">
            <input type="number" min={0} value={state.config.hsDelayed} onChange={(e) => updateConfig('hsDelayed', Number(e.target.value))} className="input-field" />
          </FormGroup>
        </div>
      </Card>

      {/* Impacto Prevenido */}
      <Card title="Impacto Prevenido — Pesos por Severidade">
        <p className="text-body" style={{ marginBottom: 16 }}>
          Configura o peso de cada bug pelo nivel de criticidade no calculo do Impacto Prevenido (Sigma peso x qtd bugs).
        </p>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <FormGroup label="Bug Critico">
            <input type="number" min={0} value={state.config.psCritical} onChange={(e) => updateConfig('psCritical', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Bug Alto">
            <input type="number" min={0} value={state.config.psHigh} onChange={(e) => updateConfig('psHigh', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Bug Medio">
            <input type="number" min={0} value={state.config.psMedium} onChange={(e) => updateConfig('psMedium', Number(e.target.value))} className="input-field" />
          </FormGroup>
          <FormGroup label="Bug Baixo">
            <input type="number" min={0} value={state.config.psLow} onChange={(e) => updateConfig('psLow', Number(e.target.value))} className="input-field" />
          </FormGroup>
        </div>
      </Card>
      </>)}

      {/* Modals rendered via portal to avoid being trapped inside collapsed accordion */}
      {showSquadChangeModal && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setShowSquadChangeModal(false)}
          className="modal-backdrop modal-backdrop-high"
        >
          <div className="modal-container" style={{ width: 420, borderTop: '3px solid var(--color-amber-mid)' }}>
            <h3 className="heading-sm" style={{ margin: '0 0 12px', fontSize: 15 }}>
              Alterar Squad da Sprint
            </h3>
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 16,
              background: 'var(--color-amber-light)', border: '1px solid var(--color-amber-mid)',
              fontSize: 13, color: 'var(--color-amber)', lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Atencao — esta acao tem impacto:</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>A sprint sera movida para outro squad</li>
                <li>Membros do squad anterior perderao acesso a esta sprint</li>
                <li>Membros do novo squad passarao a ver e editar esta sprint</li>
                <li>Dados da sprint (testes, bugs, reports) serao preservados</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <span className="text-small">De:</span>
                <span className="heading-sm" style={{ fontSize: 13 }}>
                  {state.config.squad || '(sem squad)'}
                </span>
                <span className="text-muted" style={{ fontSize: 12 }}>&rarr;</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-blue)' }}>
                  {squads.find((s) => s.id === pendingSquadId)?.name ?? '—'}
                </span>
              </div>

              <label className="label-field">
                Digite sua senha para confirmar
              </label>
              <input
                type="password"
                autoFocus
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSquadChange() }}
                placeholder="Senha da sua conta"
                className="input-field"
                style={{ borderColor: confirmError ? 'var(--color-red)' : undefined }}
              />
              {confirmError && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-red)' }}>
                  {confirmError}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSquadChangeModal(false)}
                className="btn btn-outline btn-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSquadChange}
                disabled={confirming || !confirmPassword.trim()}
                className="btn btn-md"
                style={{
                  background: confirming || !confirmPassword.trim() ? 'var(--color-border)' : 'var(--color-amber-mid)',
                  color: '#fff', fontWeight: 600,
                  cursor: confirming ? 'not-allowed' : 'pointer',
                }}
              >
                {confirming ? 'Verificando...' : 'Confirmar alteracao'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showReleaseChangeModal && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setShowReleaseChangeModal(false)}
          className="modal-backdrop modal-backdrop-high"
        >
          <div className="modal-container" style={{ width: 420, borderTop: '3px solid var(--color-amber-mid)' }}>
            <h3 className="heading-sm" style={{ margin: '0 0 12px', fontSize: 15 }}>
              Alterar Release Vinculada
            </h3>
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 16,
              background: 'var(--color-amber-light)', border: '1px solid var(--color-amber-mid)',
              fontSize: 13, color: 'var(--color-amber)', lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Atencao — esta acao tem impacto:</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Esta sprint sera desvinculada da release atual</li>
                <li>Os dados de testes da sprint NAO serao alterados</li>
                <li>A aba Regressivos da release anterior deixara de contabilizar esta sprint</li>
                <li>A nova release passara a incluir esta sprint nas metricas consolidadas</li>
              </ul>
            </div>

            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <span className="text-small">De:</span>
              <span className="heading-sm" style={{ fontSize: 13 }}>
                {currentReleaseId
                  ? allReleases.find((r) => r.id === currentReleaseId)?.version + ' — ' + allReleases.find((r) => r.id === currentReleaseId)?.title
                  : 'Nenhuma'}
              </span>
              <span className="text-muted" style={{ fontSize: 12 }}>&rarr;</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-blue)' }}>
                {pendingReleaseId
                  ? allReleases.find((r) => r.id === pendingReleaseId)?.version + ' — ' + allReleases.find((r) => r.id === pendingReleaseId)?.title
                  : 'Nenhuma'}
              </span>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReleaseChangeModal(false)}
                className="btn btn-outline btn-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReleaseChange}
                className="btn btn-md"
                style={{ background: 'var(--color-amber-mid)', color: '#fff', fontWeight: 600 }}
              >
                Confirmar alteracao
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// --- Sub-components ---

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div className="heading-sm" style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', fontSize: 14 }}>
        {title}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-field">{label}</label>
      {children}
    </div>
  )
}
