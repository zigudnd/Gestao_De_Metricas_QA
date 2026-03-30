import { useState, useEffect } from 'react'
import { useSprintStore } from '../../store/sprintStore'
import { upsertSprintInMasterIndex } from '../../services/persistence'
import type { SprintConfig } from '../../types/sprint.types'
import { listMySquads, type Squad } from '@/modules/squads/services/squadsService'
import { useActiveSquadStore } from '@/modules/squads/store/activeSquadStore'
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

  const activeSquadId = useActiveSquadStore((s) => s.activeSquadId)
  const [squads, setSquads] = useState<Squad[]>([])
  const [showSquadChangeModal, setShowSquadChangeModal] = useState(false)
  const [pendingSquadId, setPendingSquadId] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    listMySquads().then(setSquads).catch(() => {})
  }, [])

  function handleSquadSelectChange(newSquadId: string) {
    if (!newSquadId || newSquadId === activeSquadId) return
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
      // Verificar senha com cliente isolado para não interferir na sessão ativa
      const email = (await supabase.auth.getUser()).data.user?.email
      if (!email) { setConfirmError('Erro ao obter email.'); setConfirming(false); return }
      const verifyClient = createClient(
        import.meta.env.VITE_SUPABASE_URL ?? '',
        import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const { error } = await verifyClient.auth.signInWithPassword({ email, password: confirmPassword })
      if (error) { setConfirmError('Senha incorreta.'); setConfirming(false); return }

      // Aplicar mudança
      const newSquad = squads.find((s) => s.id === pendingSquadId)
      if (newSquad) {
        updateConfig('squad', newSquad.name)
        // Atualizar squadId no master index
        if (sprintId) {
          upsertSprintInMasterIndex(sprintId, state, pendingSquadId)
        }
      }
      setShowSquadChangeModal(false)
    } catch {
      setConfirmError('Erro ao confirmar. Tente novamente.')
    } finally {
      setConfirming(false)
    }
  }

  function field(key: keyof SprintConfig, type: 'text' | 'number' | 'date' = 'text') {
    const value = state.config[key]
    return (
      <input
        type={type}
        value={String(value ?? '')}
        onChange={(e) => updateConfig(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        style={inputStyle}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sprint info */}
      <Card title="Informações da Sprint">
        <div style={grid2}>
          <FormGroup label="Título">
            <input
              type="text"
              value={state.config.title}
              onChange={(e) => updateConfig('title', e.target.value)}
              style={inputStyle}
              placeholder="Ex: QA Dashboard — Sprint 12"
            />
          </FormGroup>
          <FormGroup label="Squad / Time">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {squads.length > 0 ? (
                <select
                  value={squads.find((s) => s.name === state.config.squad)?.id ?? ''}
                  onChange={(e) => handleSquadSelectChange(e.target.value)}
                  style={selectStyle}
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
                  style={inputStyle}
                  placeholder="Nome do squad"
                />
              )}
            </div>
          </FormGroup>
          <FormGroup label="QA Responsável">
            {field('qaName')}
          </FormGroup>
          <FormGroup label="Versão Alvo">
            {field('targetVersion')}
          </FormGroup>
          <FormGroup label="Data de Início">
            {field('startDate', 'date')}
          </FormGroup>
          <FormGroup label="Data de Fim">
            {field('endDate', 'date')}
          </FormGroup>
          <FormGroup label="Duração (dias)">
            <input
              type="number"
              value={state.config.sprintDays}
              onChange={(e) => updateConfig('sprintDays', Number(e.target.value))}
              style={inputStyle}
              min={1}
              placeholder="20"
            />
          </FormGroup>
          <FormGroup label="Fins de semana">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 6 }}>
              <input
                type="checkbox"
                checked={!state.config.excludeWeekends}
                onChange={(e) => updateConfig('excludeWeekends', !e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-blue)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                Incluir fins de semana na duração
              </span>
            </label>
          </FormGroup>
        </div>
      </Card>

      {/* Outros Responsáveis */}
      <Card title="Outros Responsáveis">
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
          Adicione os demais responsáveis da sprint (PO, TL, Coordenador, Gerente, etc.).
          Eles aparecerão no Termo de Conclusão.
        </p>
        <datalist id="role-suggestions">
          {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
        </datalist>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {(state.responsibles ?? []).map((r, i) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 32px', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                list="role-suggestions"
                placeholder="Cargo (ex: PO)"
                value={r.role}
                onChange={(e) => updateResponsible(i, 'role', e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Nome completo"
                value={r.name}
                onChange={(e) => updateResponsible(i, 'name', e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={() => removeResponsible(i)}
                title="Remover"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-2)', lineHeight: 1 }}
              >✕</button>
            </div>
          ))}
        </div>
        <button
          onClick={addResponsible}
          style={{ padding: '7px 14px', border: '1px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
        >
          + Adicionar responsável
        </button>
      </Card>

      {/* Health Score */}
      <Card title="Health Score — Pesos das Penalidades">
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
          Configura o quanto cada evento desconta do Health Score (base 100).
        </p>
        <div style={grid4}>
          <FormGroup label="Bug Crítico">
            <input type="number" min={0} value={state.config.hsCritical} onChange={(e) => updateConfig('hsCritical', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Alto">
            <input type="number" min={0} value={state.config.hsHigh} onChange={(e) => updateConfig('hsHigh', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Médio">
            <input type="number" min={0} value={state.config.hsMedium} onChange={(e) => updateConfig('hsMedium', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Baixo">
            <input type="number" min={0} value={state.config.hsLow} onChange={(e) => updateConfig('hsLow', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Reteste">
            <input type="number" min={0} value={state.config.hsRetest} onChange={(e) => updateConfig('hsRetest', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Tela Bloqueada">
            <input type="number" min={0} value={state.config.hsBlocked} onChange={(e) => updateConfig('hsBlocked', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Caso em Atraso">
            <input type="number" min={0} value={state.config.hsDelayed} onChange={(e) => updateConfig('hsDelayed', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
        </div>
      </Card>

      {/* Modal: Confirmar mudança de squad */}
      {showSquadChangeModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowSquadChangeModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div style={{
            background: 'var(--color-surface)',
            border: '0.5px solid var(--color-border)',
            borderTop: '3px solid var(--color-amber-mid)',
            borderRadius: 12, padding: '24px 22px',
            width: 420, maxWidth: '90vw',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              Alterar Squad da Sprint
            </h3>
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 16,
              background: 'var(--color-amber-light)', border: '1px solid var(--color-amber-mid)',
              fontSize: 13, color: 'var(--color-amber)', lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Atenção — esta ação tem impacto:</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>A sprint sera movida para outro squad</li>
                <li>Membros do squad anterior perderao acesso a esta sprint</li>
                <li>Membros do novo squad passarao a ver e editar esta sprint</li>
                <li>Dados da sprint (testes, bugs, reports) serao preservados</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>De:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  {state.config.squad || '(sem squad)'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>→</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-blue)' }}>
                  {squads.find((s) => s.id === pendingSquadId)?.name ?? '—'}
                </span>
              </div>

              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Digite sua senha para confirmar
              </label>
              <input
                type="password"
                autoFocus
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSquadChange() }}
                placeholder="Senha da sua conta"
                style={{
                  ...inputStyle,
                  borderColor: confirmError ? 'var(--color-red)' : undefined,
                }}
              />
              {confirmError && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-red)' }}>
                  {confirmError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSquadChangeModal(false)}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  border: '1px solid var(--color-border-md)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSquadChange}
                disabled={confirming || !confirmPassword.trim()}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: confirming || !confirmPassword.trim() ? 'var(--color-border)' : 'var(--color-amber-mid)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                {confirming ? 'Verificando...' : 'Confirmar alteracao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impacto Prevenido */}
      <Card title="Impacto Prevenido — Pesos por Severidade">
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
          Configura o peso de cada bug pelo nível de criticidade no cálculo do Impacto Prevenido (Σ peso × qtd bugs).
        </p>
        <div style={grid4}>
          <FormGroup label="Bug Crítico">
            <input type="number" min={0} value={state.config.psCritical} onChange={(e) => updateConfig('psCritical', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Alto">
            <input type="number" min={0} value={state.config.psHigh} onChange={(e) => updateConfig('psHigh', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Médio">
            <input type="number" min={0} value={state.config.psMedium} onChange={(e) => updateConfig('psMedium', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Baixo">
            <input type="number" min={0} value={state.config.psLow} onChange={(e) => updateConfig('psLow', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
        </div>
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
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
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '8px 28px 8px 10px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 16,
}

const grid4: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 16,
}
