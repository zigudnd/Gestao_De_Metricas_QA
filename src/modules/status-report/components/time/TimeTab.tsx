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
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="heading-md" style={{ margin: 0 }}>
              Membros do time
            </h3>
            <p className="text-small text-muted" style={{ margin: '2px 0 0' }}>
              {efetivos.length} efetivo{efetivos.length !== 1 ? 's' : ''}
              {temporarios.length > 0 && ` + ${temporarios.length} temporário${temporarios.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {!showAddMember && (
            <button
              onClick={() => setShowAddMember(true)}
              className="btn btn-primary btn-sm"
            >
              + Convidar membro
            </button>
          )}
        </div>

        {/* Form de convidar */}
        {showAddMember && (
          <div className="mb-4">
            <AddMemberForm
              existingMemberIds={existingUserIds}
              onAdd={(m) => { addMembro(m); setShowAddMember(false) }}
              onCancel={() => setShowAddMember(false)}
            />
          </div>
        )}

        {/* Efetivos */}
        {efetivos.length > 0 && (
          <div className="mb-6">
            <span className="section-label" style={{ marginBottom: 8 }}>
              Efetivos do squad
            </span>
            <div className="flex flex-col gap-1.5">
              {efetivos.map((m) => (
                <MemberRow key={m.id} membro={m} />
              ))}
            </div>
          </div>
        )}

        {/* Divider between efetivos and temporarios */}
        {efetivos.length > 0 && temporarios.length > 0 && (
          <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 24 }} />
        )}

        {/* Temporarios */}
        {temporarios.length > 0 && (
          <div className="mb-6">
            <span className="section-label" style={{ color: 'var(--color-amber)', marginBottom: 8 }}>
              Temporários / Rotação
            </span>
            <div className="flex flex-col gap-1.5">
              {temporarios.map((m) => (
                <MemberRow key={m.id} membro={m} onRemove={removeMembro} onUpdate={updateMembro} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {efetivos.length === 0 && temporarios.length === 0 && !showAddMember && (
          <div className="text-center text-muted" style={{ padding: '24px 16px' }}>
            <p className="text-body" style={{ margin: '0 0 4px' }}>
              Nenhum membro no time.
            </p>
            <p className="text-small" style={{ margin: 0 }}>
              Membros efetivos aparecem automaticamente do cadastro do squad. Use &quot;Convidar membro&quot; para adicionar temporários.
            </p>
          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 24 }} />

      {/* ── Offs / Ferias ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="heading-md" style={{ margin: 0 }}>
              Períodos de Off / Férias
            </h3>
            <p className="text-small text-muted" style={{ margin: '2px 0 0' }}>
              {offsEnriquecidos.length} {offsEnriquecidos.length === 1 ? 'período' : 'períodos'}
            </p>
          </div>
          {!showAddOff && (
            <button
              onClick={() => setShowAddOff(true)}
              className="btn btn-primary btn-sm"
            >
              + Registrar período
            </button>
          )}
        </div>

        {showAddOff && (
          <div className="mb-3.5">
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
