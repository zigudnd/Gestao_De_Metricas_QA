import { useRef } from 'react'
import {
  DEFAULT_PERMISSIONS,
  type Squad, type SquadMember, type SquadRole, type MemberPermissions, type PermissionProfile,
} from '../services/squadsService'
import { PermissionsEditor } from './PermissionsEditor'
import type { Profile } from '@/modules/auth/store/authStore'

const AVATAR_STYLES: Record<string, React.CSSProperties> = {
  admin:       { background: 'var(--color-yellow-light)', color: 'var(--color-yellow)', border: '0.5px solid var(--color-amber-mid)' },
  qa_lead:     { background: 'var(--color-blue-light)', color: 'var(--color-blue-text)', border: '0.5px solid var(--color-blue)' },
  qa:          { background: 'var(--color-green-light)', color: 'var(--color-green)', border: '0.5px solid var(--color-green-mid)' },
  stakeholder: { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' },
}
function avatarStyle(role?: string, isAdmin?: boolean): React.CSSProperties {
  if (isAdmin) return AVATAR_STYLES.admin
  return AVATAR_STYLES[role || 'qa'] || {}
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
    <div className="px-4.5 py-4" style={{ borderTop: '0.5px solid var(--color-border)' }}>
      {membersLoading ? (
        <p className="text-body">Carregando...</p>
      ) : (
        <>
          {/* Lista de membros */}
          {members.length === 0 ? (
            <p className="text-small text-muted italic mb-3.5">Nenhum membro além de você.</p>
          ) : (
            <div className="flex flex-col gap-3 mb-4">
              {members.map((m) => {
                const isMe = m.user_id === currentUserId
                const isAdminMember = m.profile?.global_role === 'admin' || m.profile?.global_role === 'gerente'
                const isEditingP = editingPermsMember === m.id
                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-2.5 py-1.5">
                      <div className="avatar" style={avatarStyle(m.role, isAdminMember)}>
                        {(m.profile?.display_name ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-body" style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                          {m.profile?.display_name ?? '—'}
                        </span>
                        {isMe && <span className="text-small text-muted ml-1">(você)</span>}
                        <span className="text-small text-muted ml-2">{m.profile?.email}</span>
                      </div>
                      {canManage && !isMe && !isAdminMember ? (
                        <select value={m.role} onChange={(e) => handleRoleChange(m, e.target.value as SquadRole)} className="badge badge-neutral cursor-pointer" style={{
                          outline: 'none', appearance: 'none',
                          paddingRight: 20,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
                        }}>
                          <option value="qa_lead">QA Lead</option>
                          <option value="qa">QA</option>
                          <option value="stakeholder">Stakeholder</option>
                        </select>
                      ) : (
                        <span className="badge badge-neutral">{m.profile?.global_role === 'admin' ? 'Admin' : m.profile?.global_role === 'gerente' ? 'Gerente' : ROLE_LABEL[m.role]}</span>
                      )}
                      {canManage && !isAdminMember && (
                        <button onClick={() => isEditingP ? setEditingPermsMember(null) : startEditPerms(m)} className="btn btn-ghost" style={isEditingP ? { color: 'var(--color-blue)' } : undefined}>
                          {isEditingP ? 'Fechar' : 'Permissões'}
                        </button>
                      )}
                      {(canManage || isMe) && !isAdminMember && (
                        <button
                          onClick={() => setDeleteMemberTarget(m)}
                          title={isMe ? 'Sair' : 'Remover'}
                          className="sq-btn-remove flex items-center justify-center shrink-0 cursor-pointer rounded-md"
                          style={{ background: 'none', border: 'none', color: '#A32D2D', width: 24, height: 24, fontSize: 12, transition: 'background 0.15s' }}
                        >×</button>
                      )}
                    </div>
                    {isEditingP && (
                      <div className="ml-10 mt-1.5 mb-2">
                        <PermissionsEditor value={editingPerms} onChange={setEditingPerms} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => savePerms(m.id)} disabled={savingPerms} className="btn btn-primary btn-md">
                            {savingPerms ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditingPermsMember(null)} className="btn btn-ghost">Cancelar</button>
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
            <div className="pt-3.5" style={{ borderTop: '0.5px solid var(--color-border)' }}>
              {!showAddMemberForm ? (
                <button onClick={() => setShowAddMemberForm(true)} className="btn btn-ghost py-1.5 px-0" style={{ color: 'var(--color-blue)', fontSize: 13 }}>
                  + Adicionar membro
                </button>
              ) : (
              <div>
              <div className="flex items-center justify-between mb-2">
                <span className="section-label">Adicionar membro</span>
                <button onClick={() => setShowAddMemberForm(false)} className="btn btn-ghost">Fechar</button>
              </div>
              <div className="flex flex-col gap-2.5">
                {/* Busca com autocomplete */}
                <div ref={dropdownRef} className="relative">
                  <input
                    value={userSearch}
                    onChange={(e) => handleUserSearchChange(e.target.value)}
                    onKeyDown={handleUserSearchKeyDown}
                    onFocus={() => { if (!addUserId) setShowUserDropdown(true) }}
                    placeholder="Buscar por nome ou e-mail..."
                    className="input-field"
                    style={addUserId ? { borderColor: 'var(--color-blue)', background: 'var(--color-blue-light)' } : undefined}
                  />
                  {addUserId && (
                    <button
                      type="button"
                      onClick={() => { setAddUserId(''); setUserSearch(''); setShowUserDropdown(true) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted"
                      style={{ background: 'none', border: 'none', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
                    >×</button>
                  )}
                  {showUserDropdown && userSearch.length > 0 && !addUserId && availableUsers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto" style={{
                      border: '0.5px solid var(--color-border)',
                      background: 'var(--color-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}>
                      {availableUsers.slice(0, 8).map((u) => (
                        <div
                          key={u.id}
                          onClick={() => selectUser(u)}
                          className="sq-dropdown-item flex items-center gap-2 w-full cursor-pointer"
                          style={{
                            padding: '8px 12px',
                            background: 'var(--color-bg)',
                            borderBottom: '0.5px solid var(--color-border)',
                          }}
                        >
                          <div className="avatar avatar-sm">
                            {(u.display_name ?? '?')[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-small" style={{ fontWeight: 500, color: 'var(--color-text)' }}>{u.display_name}</div>
                            <div className="text-small text-muted" style={{ fontSize: 11 }}>{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Role + Perfil + botão */}
                <div className="flex gap-2 items-center flex-wrap">
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as SquadRole)}
                    className="select-field w-auto min-w-[120px]"
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
                    className="select-field w-auto flex-1"
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
                    className="btn btn-primary btn-md shrink-0"
                  >
                    {adding ? 'Adicionando...' : '+ Adicionar'}
                  </button>
                </div>
              </div>
              {addError && (
                <p className="text-small mt-1.5" style={{ color: '#A32D2D' }}>{addError}</p>
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
