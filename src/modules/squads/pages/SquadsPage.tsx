import { useState, useEffect, useCallback } from 'react'
import {
  listMySquads, createSquad, updateSquadName, deleteSquad,
  listSquadMembers, addMember, updateMemberRole, updateMemberPermissions,
  removeMember, getMyRole, listAllUsers, setGlobalRole,
  DEFAULT_PERMISSIONS, PERMISSION_LABELS,
  type Squad, type SquadMember, type SquadRole, type MemberPermissions,
} from '../services/squadsService'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { useAuthStore } from '@/modules/auth/store/authStore'
import type { Profile } from '@/modules/auth/store/authStore'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<SquadRole, string> = {
  qa_lead: 'QA Lead', qa: 'QA', stakeholder: 'Stakeholder',
}

const ROLE_STYLE: Record<SquadRole, React.CSSProperties> = {
  qa_lead:     { background: '#E6F1FB', color: '#185FA5', border: '1px solid #B5D4F4' },
  qa:          { background: '#F0FDE8', color: '#3a6b12', border: '1px solid #b6e58a' },
  stakeholder: { background: '#F4F4F4', color: '#555',    border: '1px solid #ddd' },
}

// ─── PermissionsEditor ────────────────────────────────────────────────────────

function PermissionsEditor({
  value,
  onChange,
  disabled,
}: {
  value: MemberPermissions
  onChange: (p: MemberPermissions) => void
  disabled?: boolean
}) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)', marginBottom: 2 }}>
        Permissões de exclusão
      </span>
      {(Object.keys(PERMISSION_LABELS) as (keyof MemberPermissions)[]).map((key) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
          <input
            type="checkbox"
            checked={value[key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            style={{ width: 15, height: 15, accentColor: '#185FA5', cursor: disabled ? 'default' : 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{PERMISSION_LABELS[key]}</span>
        </label>
      ))}
    </div>
  )
}

// ─── SquadsPage ────────────────────────────────────────────────────────────────

export function SquadsPage() {
  const { user, profile: myProfile } = useAuthStore()
  const isAdmin = myProfile?.global_role === 'admin'

  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSquad, setActiveSquad] = useState<Squad | null>(null)
  const [tab, setTab] = useState<'members' | 'add'>('members')

  const [members, setMembers] = useState<SquadMember[]>([])
  const [myRole, setMyRole] = useState<SquadRole | null>(null)
  const [membersLoading, setMembersLoading] = useState(false)

  // All users (for Add tab)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')

  // Add member form
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<SquadRole>('qa')
  const [addPerms, setAddPerms] = useState<MemberPermissions>({ ...DEFAULT_PERMISSIONS })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Editing permissions inline
  const [editingPermsMember, setEditingPermsMember] = useState<string | null>(null)
  const [editingPerms, setEditingPerms] = useState<MemberPermissions>({ ...DEFAULT_PERMISSIONS })
  const [savingPerms, setSavingPerms] = useState(false)

  // Squad modals
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteSquadTarget, setDeleteSquadTarget] = useState<Squad | null>(null)
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<SquadMember | null>(null)

  const [error, setError] = useState('')

  // ── Load squads ──────────────────────────────────────────────────────────────

  const loadSquads = useCallback(async () => {
    try {
      const data = await listMySquads()
      setSquads(data)
      if (data.length > 0 && !activeSquad) setActiveSquad(data[0])
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [activeSquad])

  useEffect(() => { loadSquads() }, []) // eslint-disable-line

  // ── Load members + all users when squad changes ──────────────────────────────

  useEffect(() => {
    if (!activeSquad) return
    setMembersLoading(true)
    Promise.all([
      listSquadMembers(activeSquad.id),
      getMyRole(activeSquad.id),
      listAllUsers(),
    ]).then(([m, role, users]) => {
      setMembers(m)
      setMyRole(role)
      setAllUsers(users)
      setMembersLoading(false)
    }).catch(() => setMembersLoading(false))
  }, [activeSquad])

  const canManage = isAdmin || myRole === 'qa_lead'

  // Users not yet members of this squad
  const memberIds = new Set(members.map((m) => m.user_id))
  const availableUsers = allUsers.filter((u) =>
    !memberIds.has(u.id) &&
    (userSearch === '' ||
      u.display_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

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
    } catch (e) { setError(errMsg(e)) }
    finally { setCreating(false) }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSquad || !editName.trim()) return
    try {
      await updateSquadName(editingSquad.id, editName.trim())
      const updated = { ...editingSquad, name: editName.trim() }
      setSquads((prev) => prev.map((s) => s.id === editingSquad.id ? updated : s))
      if (activeSquad?.id === editingSquad.id) setActiveSquad(updated)
      setEditingSquad(null)
    } catch (e) { setError(errMsg(e)) }
  }

  async function handleDeleteSquad() {
    if (!deleteSquadTarget) return
    try {
      await deleteSquad(deleteSquadTarget.id)
      const updated = squads.filter((s) => s.id !== deleteSquadTarget.id)
      setSquads(updated)
      if (activeSquad?.id === deleteSquadTarget.id) setActiveSquad(updated[0] ?? null)
    } catch (e) { setError(errMsg(e)) }
    finally { setDeleteSquadTarget(null) }
  }

  // ── Add member ────────────────────────────────────────────────────────────────

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSquad || !addUserId) return
    setAdding(true)
    setAddError('')
    try {
      await addMember(activeSquad.id, addUserId, addRole, addPerms)
      const updated = await listSquadMembers(activeSquad.id)
      setMembers(updated)
      setAddUserId('')
      setAddRole('qa')
      setAddPerms({ ...DEFAULT_PERMISSIONS })
      setTab('members')
    } catch (e) { setAddError(errMsg(e)) }
    finally { setAdding(false) }
  }

  // ── Edit permissions ──────────────────────────────────────────────────────────

  function startEditPerms(m: SquadMember) {
    setEditingPermsMember(m.id)
    setEditingPerms({ ...m.permissions })
  }

  async function savePerms(memberId: string) {
    setSavingPerms(true)
    try {
      await updateMemberPermissions(memberId, editingPerms)
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, permissions: editingPerms } : m))
      setEditingPermsMember(null)
    } catch (e) { setError(errMsg(e)) }
    finally { setSavingPerms(false) }
  }

  // ── Role change ───────────────────────────────────────────────────────────────

  async function handleRoleChange(m: SquadMember, role: SquadRole) {
    try {
      await updateMemberRole(m.id, role)
      setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, role } : x))
    } catch (e) { setError(errMsg(e)) }
  }

  // ── Remove member ─────────────────────────────────────────────────────────────

  async function handleRemoveMember() {
    if (!deleteMemberTarget) return
    try {
      await removeMember(deleteMemberTarget.id)
      setMembers((prev) => prev.filter((m) => m.id !== deleteMemberTarget.id))
    } catch (e) { setError(errMsg(e)) }
    finally { setDeleteMemberTarget(null) }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--color-text-2)', fontSize: 14 }}>Carregando...</div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>

      {/* ── Sidebar de squads ─────────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 4,
      }}>
        <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelSm}>Squads</span>
          <button onClick={() => setShowCreate(true)} title="Novo squad" style={btnIcon}>+</button>
        </div>

        {squads.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '8px 14px' }}>Nenhum squad ainda.</p>
          : squads.map((s) => (
            <button key={s.id} onClick={() => { setActiveSquad(s); setTab('members') }} style={{
              textAlign: 'left', padding: '9px 14px',
              background: activeSquad?.id === s.id ? 'var(--color-blue-light)' : 'transparent',
              color: activeSquad?.id === s.id ? 'var(--color-blue-text)' : 'var(--color-text)',
              border: 'none',
              borderLeft: activeSquad?.id === s.id ? '2px solid var(--color-blue)' : '2px solid transparent',
              cursor: 'pointer', fontSize: 13,
              fontWeight: activeSquad?.id === s.id ? 600 : 400,
              width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {s.name}
            </button>
          ))
        }
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!activeSquad ? (
          <div style={{ padding: '40px 24px' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 16 }}>
              Crie um squad para começar a colaborar.
            </p>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>Criar Squad</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
                {activeSquad.name}
              </h2>
              {canManage && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditingSquad(activeSquad); setEditName(activeSquad.name) }} style={btnGhost}>Renomear</button>
                  <button onClick={() => setDeleteSquadTarget(activeSquad)} style={{ ...btnGhost, color: '#E24B4A', borderColor: '#E24B4A' }}>Excluir</button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ padding: '12px 24px 0', display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
              {(['members', 'add'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '8px 16px',
                  background: 'none', border: 'none',
                  borderBottom: tab === t ? '2px solid #185FA5' : '2px solid transparent',
                  marginBottom: -1,
                  color: tab === t ? '#185FA5' : 'var(--color-text-2)',
                  fontWeight: tab === t ? 600 : 400,
                  fontSize: 13, cursor: 'pointer',
                }}>
                  {t === 'members' ? `Membros (${members.length})` : 'Cadastrar Membro'}
                </button>
              ))}
            </div>

            {/* Tab: Members */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {tab === 'members' && (
                <>
                  {membersLoading ? (
                    <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Carregando...</p>
                  ) : members.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Nenhum membro ainda.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {members.map((m) => {
                        const isMe = m.user_id === user?.id
                        const isAdminMember = m.profile?.global_role === 'admin'
                        const isEditingPerms = editingPermsMember === m.id

                        return (
                          <div key={m.id} style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 10,
                            padding: '12px 14px',
                          }}>
                            {/* Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {/* Avatar */}
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: isAdminMember ? '#FEF3C7' : '#E6F1FB',
                                color: isAdminMember ? '#B45309' : '#185FA5',
                                border: isAdminMember ? '1.5px solid #FCD34D' : '1.5px solid #B5D4F4',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700, flexShrink: 0,
                              }}>
                                {(m.profile?.display_name ?? '?')[0].toUpperCase()}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {m.profile?.display_name ?? '—'}
                                  {isMe && <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>(você)</span>}
                                  {isAdminMember && (
                                    <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', borderRadius: 20, padding: '1px 7px', letterSpacing: '0.04em' }}>
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.profile?.email ?? '—'}
                                </div>
                              </div>

                              {/* Role */}
                              {canManage && !isMe && !isAdminMember ? (
                                <select value={m.role} onChange={(e) => handleRoleChange(m, e.target.value as SquadRole)} style={{
                                  ...ROLE_STYLE[m.role], borderRadius: 20, fontSize: 11, fontWeight: 600,
                                  padding: '3px 8px', cursor: 'pointer', outline: 'none',
                                }}>
                                  <option value="qa_lead">QA Lead</option>
                                  <option value="qa">QA</option>
                                  <option value="stakeholder">Stakeholder</option>
                                </select>
                              ) : (
                                <span style={{ ...ROLE_STYLE[isAdminMember ? 'qa_lead' : m.role], borderRadius: 20, fontSize: 11, fontWeight: 600, padding: '3px 8px' }}>
                                  {isAdminMember ? 'Admin' : ROLE_LABEL[m.role]}
                                </span>
                              )}

                              {/* Actions */}
                              {canManage && !isAdminMember && (
                                <button
                                  onClick={() => isEditingPerms ? setEditingPermsMember(null) : startEditPerms(m)}
                                  style={{ ...btnGhost, fontSize: 12, padding: '4px 10px', color: isEditingPerms ? '#185FA5' : undefined, borderColor: isEditingPerms ? '#185FA5' : undefined }}
                                >
                                  {isEditingPerms ? 'Fechar' : 'Permissões'}
                                </button>
                              )}

                              {(canManage || isMe) && !isAdminMember && (
                                <button
                                  onClick={() => setDeleteMemberTarget(m)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 17, padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
                                  title={isMe ? 'Sair do squad' : 'Remover'}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#E24B4A' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-3)' }}
                                >
                                  ×
                                </button>
                              )}
                            </div>

                            {/* Permissions panel (inline) */}
                            {isEditingPerms && (
                              <div style={{ marginTop: 12 }}>
                                <PermissionsEditor value={editingPerms} onChange={setEditingPerms} />
                                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                  <button onClick={() => savePerms(m.id)} disabled={savingPerms} style={btnPrimary}>
                                    {savingPerms ? 'Salvando...' : 'Salvar permissões'}
                                  </button>
                                  <button onClick={() => setEditingPermsMember(null)} style={btnGhost}>Cancelar</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Tab: Add member */}
              {tab === 'add' && (
                <div style={{ maxWidth: 520 }}>
                  {!canManage ? (
                    <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                      Apenas QA Lead ou Admin podem adicionar membros.
                    </p>
                  ) : (
                    <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Search + user list */}
                      <div>
                        <label style={labelSm}>Selecionar usuário</label>
                        <input
                          value={userSearch}
                          onChange={(e) => { setUserSearch(e.target.value); setAddUserId('') }}
                          placeholder="Buscar por nome ou e-mail..."
                          style={inputStyle}
                        />

                        {availableUsers.length > 0 ? (
                          <div style={{
                            marginTop: 6, border: '1px solid var(--color-border)',
                            borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
                          }}>
                            {availableUsers.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => { setAddUserId(u.id); setUserSearch(u.display_name) }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  width: '100%', padding: '9px 12px',
                                  background: addUserId === u.id ? 'var(--color-blue-light)' : 'var(--color-surface)',
                                  border: 'none',
                                  borderBottom: '1px solid var(--color-border)',
                                  cursor: 'pointer', textAlign: 'left',
                                }}
                                onMouseEnter={(e) => { if (addUserId !== u.id) e.currentTarget.style.background = 'var(--color-bg)' }}
                                onMouseLeave={(e) => { if (addUserId !== u.id) e.currentTarget.style.background = 'var(--color-surface)' }}
                              >
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: u.global_role === 'admin' ? '#FEF3C7' : '#E6F1FB',
                                  color: u.global_role === 'admin' ? '#B45309' : '#185FA5',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                                }}>
                                  {u.display_name[0].toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {u.display_name}
                                    {u.global_role === 'admin' && (
                                      <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', borderRadius: 20, padding: '1px 6px' }}>ADMIN</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : userSearch ? (
                          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-3)' }}>
                            Nenhum usuário encontrado. Verifique se ele criou conta.
                          </p>
                        ) : members.length === allUsers.length ? (
                          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-3)' }}>
                            Todos os usuários cadastrados já são membros deste squad.
                          </p>
                        ) : null}
                      </div>

                      {/* Role */}
                      <div>
                        <label style={labelSm}>Papel no squad</label>
                        <select value={addRole} onChange={(e) => setAddRole(e.target.value as SquadRole)} style={inputStyle}>
                          <option value="qa_lead">QA Lead</option>
                          <option value="qa">QA</option>
                          <option value="stakeholder">Stakeholder</option>
                        </select>
                      </div>

                      {/* Permissions */}
                      <PermissionsEditor value={addPerms} onChange={setAddPerms} />

                      {addError && (
                        <p style={{ margin: 0, fontSize: 13, color: '#E24B4A', background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 6, padding: '8px 12px' }}>
                          {addError}
                        </p>
                      )}

                      <button type="submit" disabled={adding || !addUserId} style={{ ...btnPrimary, opacity: adding || !addUserId ? 0.5 : 1 }}>
                        {adding ? 'Adicionando...' : 'Adicionar ao Squad'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────────── */}

      {showCreate && (
        <div style={backdropStyle} onClick={() => setShowCreate(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Novo Squad</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSm}>Nome</label>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} required placeholder="Ex: QA Core, Mobile Team" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={btnGhost}>Cancelar</button>
                <button type="submit" disabled={creating || !newName.trim()} style={{ ...btnPrimary, opacity: creating || !newName.trim() ? 0.5 : 1 }}>
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSquad && (
        <div style={backdropStyle} onClick={() => setEditingSquad(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Renomear Squad</h3>
            <form onSubmit={handleRename} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} required />
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
          description={`Excluir "${deleteSquadTarget.name}"? Todos os membros serão removidos.`}
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
              ? `Sair do squad "${activeSquad?.name}"?`
              : `Remover ${deleteMemberTarget.profile?.display_name ?? 'este membro'} do squad?`
          }
          confirmLabel={deleteMemberTarget.user_id === user?.id ? 'Sair' : 'Remover'}
          onConfirm={handleRemoveMember}
          onCancel={() => setDeleteMemberTarget(null)}
        />
      )}

      {error && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', borderRadius: 8, padding: '10px 14px', fontSize: 13, zIndex: 9999, maxWidth: 300 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', fontWeight: 700 }}>×</button>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = { padding: '9px 18px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '7px 14px', background: 'transparent', color: 'var(--color-text-2)', border: '1px solid var(--color-border-md)', borderRadius: 7, fontSize: 13, cursor: 'pointer' }
const btnIcon: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: 18, lineHeight: 1, padding: 0 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', background: 'var(--color-bg)', border: '1px solid var(--color-border-md)', borderRadius: 7, fontSize: 13, color: 'var(--color-text)', outline: 'none' }
const labelSm: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)', marginBottom: 6 }
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }
const modalStyle: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '24px 22px', width: 360, maxWidth: '90vw' }
