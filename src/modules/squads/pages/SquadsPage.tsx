import { useState, useEffect, useCallback } from 'react'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}
import {
  listMySquads,
  createSquad,
  updateSquadName,
  deleteSquad,
  listSquadMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  getMyRole,
  type Squad,
  type SquadMember,
  type SquadRole,
} from '../services/squadsService'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { useAuthStore } from '@/modules/auth/store/authStore'

// ─── Labels ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<SquadRole, string> = {
  qa_lead: 'QA Lead',
  qa: 'QA',
  stakeholder: 'Stakeholder',
}

const ROLE_STYLE: Record<SquadRole, React.CSSProperties> = {
  qa_lead:     { background: '#E6F1FB', color: '#185FA5', border: '1px solid #B5D4F4' },
  qa:          { background: '#F0FDE8', color: '#3a6b12', border: '1px solid #b6e58a' },
  stakeholder: { background: '#F4F4F4', color: '#555', border: '1px solid #ddd' },
}

// ─── SquadsPage ────────────────────────────────────────────────────────────────

export function SquadsPage() {
  const user = useAuthStore((s) => s.user)
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)

  const [activeSquad, setActiveSquad] = useState<Squad | null>(null)
  const [members, setMembers] = useState<SquadMember[]>([])
  const [myRole, setMyRole] = useState<SquadRole | null>(null)
  const [membersLoading, setMembersLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteSquadTarget, setDeleteSquadTarget] = useState<Squad | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<SquadRole>('qa')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const [deleteMemberTarget, setDeleteMemberTarget] = useState<SquadMember | null>(null)

  const [error, setError] = useState('')

  // ── Load squads ──────────────────────────────────────────────────────────────

  const loadSquads = useCallback(async () => {
    try {
      const data = await listMySquads()
      setSquads(data)
      if (data.length > 0 && !activeSquad) {
        setActiveSquad(data[0])
      }
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [activeSquad])

  useEffect(() => { loadSquads() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load members when active squad changes ───────────────────────────────────

  useEffect(() => {
    if (!activeSquad) return
    setMembersLoading(true)
    Promise.all([
      listSquadMembers(activeSquad.id),
      getMyRole(activeSquad.id),
    ]).then(([m, role]) => {
      setMembers(m)
      setMyRole(role)
      setMembersLoading(false)
    }).catch(() => setMembersLoading(false))
  }, [activeSquad])

  // ── Create squad ─────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const squad = await createSquad(newName.trim())
      setSquads((prev) => [...prev, squad])
      setActiveSquad(squad)
      setNewName('')
      setShowCreate(false)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setCreating(false)
    }
  }

  // ── Rename squad ─────────────────────────────────────────────────────────────

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSquad || !editName.trim()) return
    try {
      await updateSquadName(editingSquad.id, editName.trim())
      setSquads((prev) =>
        prev.map((s) => s.id === editingSquad.id ? { ...s, name: editName.trim() } : s)
      )
      if (activeSquad?.id === editingSquad.id) {
        setActiveSquad((s) => s ? { ...s, name: editName.trim() } : s)
      }
      setEditingSquad(null)
    } catch (e) {
      setError(errMsg(e))
    }
  }

  // ── Delete squad ─────────────────────────────────────────────────────────────

  async function handleDeleteSquad() {
    if (!deleteSquadTarget) return
    try {
      await deleteSquad(deleteSquadTarget.id)
      const updated = squads.filter((s) => s.id !== deleteSquadTarget.id)
      setSquads(updated)
      if (activeSquad?.id === deleteSquadTarget.id) {
        setActiveSquad(updated[0] ?? null)
      }
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setDeleteSquadTarget(null)
    }
  }

  // ── Invite member ─────────────────────────────────────────────────────────────

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSquad || !inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    try {
      await inviteMember(activeSquad.id, inviteEmail.trim(), inviteRole)
      const updated = await listSquadMembers(activeSquad.id)
      setMembers(updated)
      setInviteEmail('')
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : String(e))
    } finally {
      setInviting(false)
    }
  }

  // ── Update role ───────────────────────────────────────────────────────────────

  async function handleRoleChange(member: SquadMember, role: SquadRole) {
    try {
      await updateMemberRole(member.id, role)
      setMembers((prev) =>
        prev.map((m) => m.id === member.id ? { ...m, role } : m)
      )
    } catch (e) {
      setError(errMsg(e))
    }
  }

  // ── Remove member ─────────────────────────────────────────────────────────────

  async function handleRemoveMember() {
    if (!deleteMemberTarget) return
    try {
      await removeMember(deleteMemberTarget.id)
      setMembers((prev) => prev.filter((m) => m.id !== deleteMemberTarget.id))
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setDeleteMemberTarget(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--color-text-2)', fontSize: 14 }}>
        Carregando squads...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 0 }}>

      {/* ── Sidebar de squads ─────────────────────────────────────────────────── */}
      <div style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        paddingTop: 4,
      }}>
        <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--color-text-2)', textTransform: 'uppercase' }}>
            Squads
          </span>
          <button
            onClick={() => setShowCreate(true)}
            title="Novo squad"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-2)', fontSize: 18, lineHeight: 1, padding: 0,
            }}
          >
            +
          </button>
        </div>

        {squads.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '8px 14px' }}>
            Nenhum squad ainda.
          </p>
        ) : (
          squads.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSquad(s)}
              style={{
                textAlign: 'left',
                padding: '9px 14px',
                background: activeSquad?.id === s.id ? 'var(--color-blue-light)' : 'transparent',
                color: activeSquad?.id === s.id ? 'var(--color-blue-text)' : 'var(--color-text)',
                border: 'none',
                borderLeft: activeSquad?.id === s.id ? '2px solid var(--color-blue)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeSquad?.id === s.id ? 600 : 400,
                width: '100%',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.name}
            </button>
          ))
        )}
      </div>

      {/* ── Conteúdo do squad ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 0 0 24px', overflow: 'auto', minWidth: 0 }}>
        {!activeSquad ? (
          <div style={{ paddingTop: 40 }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 16 }}>
              Crie um squad para começar a colaborar.
            </p>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>
              Criar Squad
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
                {activeSquad.name}
              </h2>
              {myRole === 'qa_lead' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setEditingSquad(activeSquad); setEditName(activeSquad.name) }}
                    style={btnGhost}
                    title="Renomear squad"
                  >
                    Renomear
                  </button>
                  <button
                    onClick={() => setDeleteSquadTarget(activeSquad)}
                    style={{ ...btnGhost, color: '#E24B4A', borderColor: '#E24B4A' }}
                    title="Excluir squad"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>

            {/* Members */}
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)' }}>
                Membros ({members.length})
              </h3>

              {membersLoading ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Carregando...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map((m) => {
                    const isMe = m.user_id === user?.id
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#E6F1FB',
                          color: '#185FA5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {(m.profile?.display_name ?? '?')[0].toUpperCase()}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {m.profile?.display_name ?? '—'}
                            {isMe && <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>(você)</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.profile?.email ?? '—'}
                          </div>
                        </div>

                        {/* Role */}
                        {myRole === 'qa_lead' && !isMe ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m, e.target.value as SquadRole)}
                            style={{
                              ...ROLE_STYLE[m.role],
                              border: `1px solid`,
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="qa_lead">QA Lead</option>
                            <option value="qa">QA</option>
                            <option value="stakeholder">Stakeholder</option>
                          </select>
                        ) : (
                          <span style={{
                            ...ROLE_STYLE[m.role],
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                          }}>
                            {ROLE_LABEL[m.role]}
                          </span>
                        )}

                        {/* Remove */}
                        {(myRole === 'qa_lead' || isMe) && !isMe && (
                          <button
                            onClick={() => setDeleteMemberTarget(m)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--color-text-3)', fontSize: 16, padding: '2px 4px',
                              borderRadius: 4,
                            }}
                            title="Remover membro"
                          >
                            ×
                          </button>
                        )}
                        {isMe && myRole !== 'qa_lead' && (
                          <button
                            onClick={() => setDeleteMemberTarget(m)}
                            style={{ ...btnGhost, fontSize: 12, padding: '3px 8px' }}
                            title="Sair do squad"
                          >
                            Sair
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Invite (apenas qa_lead) */}
            {myRole === 'qa_lead' && (
              <section>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)' }}>
                  Convidar membro
                </h3>
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em', marginBottom: 5, textTransform: 'uppercase' }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }}
                      placeholder="usuario@empresa.com"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ minWidth: 130 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em', marginBottom: 5, textTransform: 'uppercase' }}>
                      Papel
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as SquadRole)}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      <option value="qa_lead">QA Lead</option>
                      <option value="qa">QA</option>
                      <option value="stakeholder">Stakeholder</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    style={{ ...btnPrimary, padding: '9px 16px', flexShrink: 0 }}
                  >
                    {inviting ? 'Convidando...' : 'Convidar'}
                  </button>
                </form>
                {inviteError && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#E24B4A' }}>{inviteError}</p>
                )}
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
                  O usuário precisa ter criado uma conta antes de ser convidado.
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Modais ──────────────────────────────────────────────────────────────── */}

      {/* Criar squad */}
      {showCreate && (
        <div style={backdropStyle} onClick={() => setShowCreate(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Novo Squad</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSm}>Nome do Squad</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: QA Core, Mobile Team"
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={btnGhost}>Cancelar</button>
                <button type="submit" disabled={creating || !newName.trim()} style={btnPrimary}>
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renomear squad */}
      {editingSquad && (
        <div style={backdropStyle} onClick={() => setEditingSquad(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Renomear Squad</h3>
            <form onSubmit={handleRename} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={inputStyle}
                required
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingSquad(null)} style={btnGhost}>Cancelar</button>
                <button type="submit" disabled={!editName.trim()} style={btnPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteSquadTarget && (
        <ConfirmModal
          title="Excluir Squad"
          description={`Excluir "${deleteSquadTarget.name}"? Todos os membros serão removidos. As sprints vinculadas ficam sem squad.`}
          confirmLabel="Excluir"
          onConfirm={handleDeleteSquad}
          onCancel={() => setDeleteSquadTarget(null)}
        />
      )}

      {deleteMemberTarget && (
        <ConfirmModal
          title={deleteMemberTarget.user_id === user?.id ? 'Sair do Squad' : 'Remover Membro'}
          description={
            deleteMemberTarget.user_id === user?.id
              ? `Você quer sair do squad "${activeSquad?.name}"?`
              : `Remover ${deleteMemberTarget.profile?.display_name ?? 'este membro'} do squad?`
          }
          confirmLabel={deleteMemberTarget.user_id === user?.id ? 'Sair' : 'Remover'}
          onConfirm={handleRemoveMember}
          onCancel={() => setDeleteMemberTarget(null)}
        />
      )}

      {error && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, background: '#FCEBEB',
          border: '1px solid #F7C1C1', color: '#A32D2D', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, zIndex: 9999, maxWidth: 300,
        }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', fontWeight: 700 }}>×</button>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  padding: '9px 18px',
  background: '#185FA5',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  padding: '7px 14px',
  background: 'transparent',
  color: 'var(--color-text-2)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 7,
  fontSize: 13,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 7,
  fontSize: 13,
  color: 'var(--color-text)',
  outline: 'none',
}

const labelSm: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-2)',
  marginBottom: 6,
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
}

const modalStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: '24px 22px',
  width: 360,
  maxWidth: '90vw',
}
