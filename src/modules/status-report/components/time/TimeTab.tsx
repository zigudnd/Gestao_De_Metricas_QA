import { useState, useMemo } from 'react'
import { useSquadConfigStore } from '../../store/squadConfigStore'
import { enriquecerOffs } from '../../services/offAlertEngine'
import { MemberRow } from './MemberRow'
import { AddMemberForm } from './AddMemberForm'
import { OffTable } from './OffTable'
import { AddOffForm } from './AddOffForm'

export function TimeTab() {
  const {
    membros, offs,
    addMembro, removeMembro, updateMembro,
    addOff, removeOff,
  } = useSquadConfigStore()

  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddOff, setShowAddOff] = useState(false)

  const hoje = new Date().toISOString().split('T')[0]
  const offsEnriquecidos = useMemo(
    () => enriquecerOffs(offs, membros, hoje),
    [offs, membros, hoje],
  )

  const efetivos = membros.filter((m) => m.tipo === 'efetivo' && m.ativo)
  const temporarios = membros.filter((m) => m.tipo === 'temporario' && m.ativo)
  const existingUserIds = membros.map((m) => m.userId).filter(Boolean) as string[]

  return (
    <div style={{ maxWidth: 900 }}>
      {/* ── Membros do Time ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              Membros do time
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
              {efetivos.length} efetivo{efetivos.length !== 1 ? 's' : ''}
              {temporarios.length > 0 && ` + ${temporarios.length} temporario${temporarios.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {!showAddMember && (
            <button
              onClick={() => setShowAddMember(true)}
              style={{
                padding: '7px 16px', borderRadius: 7, border: 'none',
                background: 'var(--color-blue)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              + Convidar membro
            </button>
          )}
        </div>

        {/* Form de convidar */}
        {showAddMember && (
          <div style={{ marginBottom: 16 }}>
            <AddMemberForm
              existingMemberIds={existingUserIds}
              onAdd={(m) => { addMembro(m); setShowAddMember(false) }}
              onCancel={() => setShowAddMember(false)}
            />
          </div>
        )}

        {/* Efetivos */}
        {efetivos.length > 0 && (
          <div style={{ marginBottom: temporarios.length > 0 ? 16 : 0 }}>
            <span style={{
              display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
            }}>
              Efetivos do squad
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {efetivos.map((m) => (
                <MemberRow key={m.id} membro={m} />
              ))}
            </div>
          </div>
        )}

        {/* Temporarios */}
        {temporarios.length > 0 && (
          <div>
            <span style={{
              display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-amber)',
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
            }}>
              Temporarios / Rotacao
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {temporarios.map((m) => (
                <MemberRow key={m.id} membro={m} onRemove={removeMembro} onUpdate={updateMembro} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {efetivos.length === 0 && temporarios.length === 0 && !showAddMember && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-3)' }}>
            <p style={{ fontSize: 13, margin: '0 0 4px' }}>
              Nenhum membro no time.
            </p>
            <p style={{ fontSize: 12, margin: 0 }}>
              Membros efetivos aparecem automaticamente do cadastro do squad. Use &quot;Convidar membro&quot; para adicionar temporarios.
            </p>
          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 24 }} />

      {/* ── Offs / Ferias ─────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              Periodos de Off / Ferias
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
              {offsEnriquecidos.length} {offsEnriquecidos.length === 1 ? 'periodo' : 'periodos'}
            </p>
          </div>
          {!showAddOff && (
            <button
              onClick={() => setShowAddOff(true)}
              style={{
                padding: '7px 16px', borderRadius: 7, border: 'none',
                background: 'var(--color-blue)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              + Registrar periodo
            </button>
          )}
        </div>

        {showAddOff && (
          <div style={{ marginBottom: 14 }}>
            <AddOffForm
              membros={membros}
              onAdd={(off) => { addOff(off); setShowAddOff(false) }}
              onCancel={() => setShowAddOff(false)}
            />
          </div>
        )}

        <OffTable offs={offsEnriquecidos} onRemove={removeOff} />
      </div>
    </div>
  )
}
