import { useRef } from 'react'
import {
  DEFAULT_PERMISSIONS,
  type Squad, type SquadMember, type SquadRole, type MemberPermissions, type PermissionProfile,
} from '../services/squadsService'
import { PermissionsEditor } from './PermissionsEditor'
import type { Profile } from '@/modules/auth/store/authStore'
import { inputStyle, selectStyle, btnPrimary, btnGhost, labelSm, avatarBase } from '@/styles/shared'
const AVATAR_STYLES: Record<string, React.CSSProperties> = {
  admin:       { background: 'var(--color-yellow-light)', color: 'var(--color-yellow)', border: '0.5px solid var(--color-amber-mid)' },
  qa_lead:     { background: 'var(--color-blue-light)', color: 'var(--color-blue-text)', border: '0.5px solid var(--color-blue)' },
  qa:          { background: 'var(--color-green-light)', color: 'var(--color-green)', border: '0.5px solid var(--color-green-mid)' },
  stakeholder: { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' },
}
function avatarStyle(role?: string, isAdmin?: boolean): React.CSSProperties {
  if (isAdmin) return { ...avatarBase, ...AVATAR_STYLES.admin }
  return { ...avatarBase, ...(AVATAR_STYLES[role || 'qa'] || {}) }
}
const roleBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8,
  background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)',
}
const ROLE_LABEL: Record<SquadRole, string> = {
  qa_lead: 'QA Lead', qa: 'QA', stakeholder: 'Stakeholder',
}

export interface SquadDetailProps {
  activeSquad: Squad
  members: SquadMember[]
  membersLoading: boolean
  currentUserId: string | undefined
  canManage: boolean
  // Permissions editing
  editingPermsMember: string | null
  editingPerms: MemberPermissions
  setEditingPerms: (p: MemberPermissions) => void
  setEditingPermsMember: (id: string | null) => void
  startEditPerms: (m: SquadMember) => void
  savePerms: (memberId: string) => void
  savingPerms: boolean
  // Role change
  handleRoleChange: (m: SquadMember, role: SquadRole) => void
  // Remove member
  setDeleteMemberTarget: (m: SquadMember | null) => void
  // Add member form
  showAddMemberForm: boolean
  setShowAddMemberForm: (v: boolean) => void
  userSearch: string
  handleUserSearchChange: (value: string) => void
  handleUserSearchKeyDown: (e: React.KeyboardEvent) => void
  addUserId: string
  setAddUserId: (v: string) => void
  setUserSearch: (v: string) => void
  showUserDropdown: boolean
  setShowUserDropdown: (v: boolean) => void
  availableUsers: Profile[]
  selectUser: (u: Profile) => void
  addRole: SquadRole
  setAddRole: (v: SquadRole) => void
  addProfileId: string
  setAddProfileId: (v: string) => void
  setAddPerms: (p: MemberPermissions) => void
  profiles: PermissionProfile[]
  adding: boolean
  handleAddMember: () => void
  addError: string
  dropdownRef: React.RefObject<HTMLDivElement | null>
}

export function SquadDetail({
  members,
  membersLoading,
  currentUserId,
  canManage,
  editingPermsMember,
  editingPerms,
  setEditingPerms,
  setEditingPermsMember,
  startEditPerms,
  savePerms,
  savingPerms,
  handleRoleChange,
  setDeleteMemberTarget,
  showAddMemberForm,
  setShowAddMemberForm,
  userSearch,
  handleUserSearchChange,
  handleUserSearchKeyDown,
  addUserId,
  setAddUserId,
  setUserSearch,
  showUserDropdown,
  setShowUserDropdown,
  availableUsers,
  selectUser,
  addRole,
  setAddRole,
  addProfileId,
  setAddProfileId,
  setAddPerms,
  profiles,
  adding,
  handleAddMember,
  addError,
  dropdownRef,
}: SquadDetailProps) {
  return (
    <div style={{ borderTop: '0.5px solid var(--color-border)', padding: '16px 18px' }}>
      {membersLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: 0 }}>Carregando...</p>
      ) : (
        <>
          {/* Lista de membros */}
          {members.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic', margin: '0 0 14px' }}>Nenhum membro além de você.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {members.map((m) => {
                const isMe = m.user_id === currentUserId
                const isAdminMember = m.profile?.global_role === 'admin' || m.profile?.global_role === 'gerente'
                const isEditingP = editingPermsMember === m.id
                return (
                  <div key={m.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                      <div style={avatarStyle(m.role, isAdminMember)}>
                        {(m.profile?.display_name ?? '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
                          {m.profile?.display_name ?? '—'}
                        </span>
                        {isMe && <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginLeft: 4 }}>(você)</span>}
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginLeft: 8 }}>{m.profile?.email}</span>
                      </div>
                      {canManage && !isMe && !isAdminMember ? (
                        <select value={m.role} onChange={(e) => handleRoleChange(m, e.target.value as SquadRole)} style={{
                          ...roleBadge, cursor: 'pointer', outline: 'none', appearance: 'none',
                          paddingRight: 20,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
                        }}>
                          <option value="qa_lead">QA Lead</option>
                          <option value="qa">QA</option>
                          <option value="stakeholder">Stakeholder</option>
                        </select>
                      ) : (
                        <span style={roleBadge}>{isAdminMember ? 'Admin' : ROLE_LABEL[m.role]}</span>
                      )}
                      {canManage && !isAdminMember && (
                        <button onClick={() => isEditingP ? setEditingPermsMember(null) : startEditPerms(m)} style={{ ...btnGhost, color: isEditingP ? 'var(--color-blue)' : undefined }}>
                          {isEditingP ? 'Fechar' : 'Permissões'}
                        </button>
                      )}
                      {(canManage || isMe) && !isAdminMember && (
                        <button
                          onClick={() => setDeleteMemberTarget(m)}
                          title={isMe ? 'Sair' : 'Remover'}
                          style={{ background: 'none', border: 'none', color: '#A32D2D', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
                          className="sq-btn-remove"
                        >×</button>
                      )}
                    </div>
                    {isEditingP && (
                      <div style={{ marginLeft: 38, marginTop: 6, marginBottom: 8 }}>
                        <PermissionsEditor value={editingPerms} onChange={setEditingPerms} />
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button onClick={() => savePerms(m.id)} disabled={savingPerms} style={btnPrimary}>
                            {savingPerms ? 'Salvando...' : 'Salvar'}
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

          {/* Adicionar membro — toggle */}
          {canManage && (
            <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 14 }}>
              {!showAddMemberForm ? (
                <button onClick={() => setShowAddMemberForm(true)} style={{ ...btnGhost, color: 'var(--color-blue)', fontSize: 13, padding: '6px 0' }}>
                  + Adicionar membro
                </button>
              ) : (
              <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={labelSm}>Adicionar membro</span>
                <button onClick={() => setShowAddMemberForm(false)} style={btnGhost}>Fechar</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Busca com autocomplete */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <input
                    value={userSearch}
                    onChange={(e) => handleUserSearchChange(e.target.value)}
                    onKeyDown={handleUserSearchKeyDown}
                    onFocus={() => { if (!addUserId) setShowUserDropdown(true) }}
                    placeholder="Buscar por nome ou e-mail..."
                    style={{
                      ...inputStyle,
                      ...(addUserId ? { borderColor: 'var(--color-blue)', background: 'var(--color-blue-light)' } : {}),
                    }}
                  />
                  {addUserId && (
                    <button
                      type="button"
                      onClick={() => { setAddUserId(''); setUserSearch(''); setShowUserDropdown(true) }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
                    >×</button>
                  )}
                  {showUserDropdown && userSearch.length > 0 && !addUserId && availableUsers.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      marginTop: 4, border: '0.5px solid var(--color-border)',
                      borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
                      background: 'var(--color-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}>
                      {availableUsers.slice(0, 8).map((u) => (
                        <div
                          key={u.id}
                          onClick={() => selectUser(u)}
                          className="sq-dropdown-item"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '8px 12px',
                            background: 'var(--color-bg)',
                            borderBottom: '0.5px solid var(--color-border)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ ...avatarBase, width: 24, height: 24, fontSize: 10 }}>
                            {u.display_name[0].toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{u.display_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Role + Perfil + botão */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as SquadRole)}
                    style={{ ...selectStyle, width: 'auto', minWidth: 120 }}
                  >
                    <option value="qa_lead">QA Lead</option>
                    <option value="qa">QA</option>
                    <option value="stakeholder">Stakeholder</option>
                  </select>
                  <select
                    value={addProfileId}
                    onChange={(e) => {
                      setAddProfileId(e.target.value)
                      const found = profiles.find((p) => p.id === e.target.value)
                      if (found) setAddPerms({ ...found.permissions })
                      else setAddPerms({ ...DEFAULT_PERMISSIONS })
                    }}
                    style={{ ...selectStyle, width: 'auto', flex: 1 }}
                  >
                    <option value="">Perfil: Sem perfil</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.is_system ? ' ★' : ''}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={adding || !addUserId}
                    onClick={handleAddMember}
                    style={{ ...btnPrimary, opacity: adding || !addUserId ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {adding ? 'Adicionando...' : '+ Adicionar'}
                  </button>
                </div>
              </div>
              {addError && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#A32D2D' }}>{addError}</p>
              )}
              </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
