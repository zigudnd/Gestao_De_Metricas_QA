import { useState, useEffect, useCallback, useRef } from 'react'
import {
  listMySquads, createSquad, updateSquad,
  listSquadMembers, addMember, updateMemberRole, updateMemberPermissions,
  removeMember, getMyRole, listAllUsers,
  listAllUsersWithSquads, createUser, updateUserProfile, toggleUserActive, resetUserPassword,
  listPermissionProfiles, createPermissionProfile, updatePermissionProfile, deletePermissionProfile,
  archiveSquad, unarchiveSquad, listArchivedSquads,
  DEFAULT_PERMISSIONS,
  type Squad, type SquadMember, type SquadRole, type MemberPermissions, type PermissionProfile,
  type UserWithSquads,
} from '../services/squadsService'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { useAuthStore } from '@/modules/auth/store/authStore'
import type { Profile } from '@/modules/auth/store/authStore'
import { PermissionsEditor } from '../components/PermissionsEditor'
import { ProfilesPanel } from '../components/ProfilesPanel'
import { UsersPanel } from '../components/UsersPanel'
import { SquadDetail } from '../components/SquadDetail'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<SquadRole, string> = {
  qa_lead: 'QA Lead', qa: 'QA', stakeholder: 'Stakeholder',
}

const SQUAD_COLORS = ['#185FA5', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777', '#4F46E5', '#0D9488', '#CA8A04']

// ─── SquadsPage ────────────────────────────────────────────────────────────────

export function SquadsPage() {
  const { user, profile: myProfile } = useAuthStore()
  const isAdmin = myProfile?.global_role === 'admin' || myProfile?.global_role === 'gerente'

  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSquad, setActiveSquad] = useState<Squad | null>(null)
  const [tab, setTab] = useState<'squads' | 'profiles' | 'users'>('squads')

  const [members, setMembers] = useState<SquadMember[]>([])
  const [myRole, setMyRole] = useState<SquadRole | null>(null)
  const [membersLoading, setMembersLoading] = useState(false)

  // All users (for Add tab)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')

  // Permission profiles
  const [profiles, setProfiles] = useState<PermissionProfile[]>([])
  // Profile CRUD
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileDesc, setProfileDesc] = useState('')
  const [profilePerms, setProfilePerms] = useState<MemberPermissions>({ ...DEFAULT_PERMISSIONS })
  const [savingProfile, setSavingProfile] = useState(false)
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<PermissionProfile | null>(null)

  // Add member form
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<SquadRole>('qa')
  const [addProfileId, setAddProfileId] = useState('')
  const [addPerms, setAddPerms] = useState<MemberPermissions>({ ...DEFAULT_PERMISSIONS })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)

  // Editing permissions inline
  const [editingPermsMember, setEditingPermsMember] = useState<string | null>(null)
  const [editingPerms, setEditingPerms] = useState<MemberPermissions>({ ...DEFAULT_PERMISSIONS })
  const [savingPerms, setSavingPerms] = useState(false)

  // Squad form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editColor, setEditColor] = useState('#185FA5')
  const [archiveSquadTarget, setArchiveSquadTarget] = useState<Squad | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedSquads, setArchivedSquads] = useState<Squad[]>([])
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<SquadMember | null>(null)

  // Users tab (admin)
  const [usersTab, setUsersTab] = useState<UserWithSquads[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithSquads | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserRole, setEditUserRole] = useState<'admin' | 'gerente' | 'user'>('user')
  // Create user form
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserWithSquads | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [batchResetting, setBatchResetting] = useState(false)
  const [showBatchResetConfirm, setShowBatchResetConfirm] = useState(false)

  const [error, _setError] = useState('')
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function setError(msg: string) {
    _setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    if (msg) errorTimerRef.current = setTimeout(() => _setError(''), 6000)
  }
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [squadSearch, setSquadSearch] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [userTabSearch, setUserTabSearch] = useState('')
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'admin' | 'gerente' | 'user'>('all')
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

  // ── Load squads ──────────────────────────────────────────────────────────────

  const loadSquads = useCallback(async () => {
    try {
      const data = await listMySquads()
      setSquads(data)
      // Auto-selecionar primeiro squad apenas se nenhum está selecionado
      setActiveSquad((prev) => {
        if (prev && data.some((s) => s.id === prev.id)) return prev
        return data.length > 0 ? data[0] : null
      })
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [])

  // Recarregar squads ao voltar para a aba squads
  useEffect(() => {
    if (tab === 'squads') loadSquads()
  }, [tab, loadSquads])

  // ── Load permission profiles independently ─────────────────────────────────
  useEffect(() => {
    listPermissionProfiles().then(setProfiles).catch((e) => { if (import.meta.env.DEV) console.warn('[Squads] Failed to load permission profiles:', e) })
  }, [])

  // ── Load members + all users when squad changes ──────────────────────────────

  useEffect(() => {
    if (!activeSquad) return
    // Limpar estado do form ao trocar de squad
    setUserSearch('')
    setAddUserId('')
    setAddRole('qa')
    setAddProfileId('')
    setAddPerms({ ...DEFAULT_PERMISSIONS })
    setAddError('')
    setShowUserDropdown(false)
    setEditingPermsMember(null)
    setMembersLoading(true)
    Promise.all([
      listSquadMembers(activeSquad.id),
      getMyRole(activeSquad.id),
      listAllUsers(),
      listPermissionProfiles(),
    ]).then(([m, role, users, profs]) => {
      setMembers(m)
      setMyRole(role)
      setAllUsers(users)
      setProfiles(profs)
      setMembersLoading(false)
    }).catch((e) => {
      setMembersLoading(false)
      setError(errMsg(e))
    })
  }, [activeSquad?.id])

  const canManage = isAdmin || myRole === 'qa_lead'

  // Users not yet members of this squad
  const memberIds = new Set(members.map((m) => m.user_id))
  const availableUsers = allUsers.filter((u) =>
    !memberIds.has(u.id) &&
    (userSearch === '' ||
      u.display_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  function handleUserSearchChange(value: string) {
    setUserSearch(value)
    setAddUserId('')
    setShowUserDropdown(true)
  }

  function selectUser(u: Profile) {
    setAddUserId(u.id)
    setUserSearch(u.display_name)
    setShowUserDropdown(false)
  }

  function handleUserSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (addUserId) { handleAddMember(); return }
      // Selecionar primeiro resultado ou match exato
      if (availableUsers.length === 1) { selectUser(availableUsers[0]); return }
      const trimmed = userSearch.trim().toLowerCase()
      const exact = availableUsers.find((u) => u.email.toLowerCase() === trimmed || u.display_name.toLowerCase() === trimmed)
      if (exact) selectUser(exact)
    }
    if (e.key === 'Escape') setShowUserDropdown(false)
  }

  // ── Create squad ─────────────────────────────────────────────────────────────

  const [showNewSquadForm, setShowNewSquadForm] = useState(false)
  const [newNameError, setNewNameError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    // Validar nome duplicado
    const exists = squads.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())
      || archivedSquads.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setNewNameError('Já existe um squad com este nome.')
      return
    }
    setNewNameError('')
    setCreating(true)
    try {
      const autoColor = SQUAD_COLORS[squads.length % SQUAD_COLORS.length]
      const squad = await createSquad(trimmed, newDesc.trim(), autoColor)
      setSquads((prev) => [...prev, squad])
      setActiveSquad(squad)
      setNewName('')
      setNewDesc('')
      setNewNameError('')
      setShowNewSquadForm(false)
      showToast('Squad criado', 'success')
    } catch (e) { setError(errMsg(e)) }
    finally { setCreating(false) }
  }

  async function handleEditSquad(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSquad || !editName.trim()) return
    try {
      await updateSquad(editingSquad.id, { name: editName.trim(), description: editDesc.trim(), color: editColor })
      const updated = { ...editingSquad, name: editName.trim(), description: editDesc.trim(), color: editColor }
      setSquads((prev) => prev.map((s) => s.id === editingSquad.id ? updated : s))
      if (activeSquad?.id === editingSquad.id) setActiveSquad(updated)
      setEditingSquad(null)
      showToast('Squad atualizado', 'success')
    } catch (e) { setError(errMsg(e)) }
  }

  // ── Archive squad ───────────────────────────────────────────────────────────

  async function handleArchiveSquad() {
    if (!archiveSquadTarget) return
    try {
      await archiveSquad(archiveSquadTarget.id)
      setSquads((prev) => prev.filter((s) => s.id !== archiveSquadTarget.id))
      if (activeSquad?.id === archiveSquadTarget.id) setActiveSquad(null)
      showToast(`"${archiveSquadTarget.name}" arquivado`, 'info')
    } catch (e) { setError(errMsg(e)) }
    finally { setArchiveSquadTarget(null) }
  }

  async function handleUnarchiveSquad(squad: Squad) {
    try {
      await unarchiveSquad(squad.id)
      setArchivedSquads((prev) => prev.filter((s) => s.id !== squad.id))
      setSquads((prev) => [...prev, { ...squad, archived: false }])
      showToast(`"${squad.name}" restaurado`, 'success')
    } catch (e) { setError(errMsg(e)) }
  }

  async function loadArchivedSquads() {
    try {
      const data = await listArchivedSquads()
      setArchivedSquads(data)
    } catch (e) { if (import.meta.env.DEV) console.warn('[Squads] Failed to load archived squads:', e) }
  }

  useEffect(() => {
    if (showArchived && isAdmin) loadArchivedSquads()
  }, [showArchived]) // eslint-disable-line

  // ── Load users for Users tab ─────────────────────────────────────────────────

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const data = await listAllUsersWithSquads()
      setUsersTab(data)
    } catch (e) { setError(errMsg(e)) }
    finally { setUsersLoading(false) }
  }

  useEffect(() => {
    if (tab === 'users' && isAdmin) loadUsers()
  }, [tab]) // eslint-disable-line

  // ── User management ─────────────────────────────────────────────────────────

  function openEditUser(u: UserWithSquads) {
    setEditingUser(u)
    setEditUserName(u.display_name)
    setEditUserRole(u.global_role)
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    try {
      await updateUserProfile(editingUser.id, { display_name: editUserName.trim(), global_role: editUserRole })
      setUsersTab((prev) => prev.map((u) =>
        u.id === editingUser.id ? { ...u, display_name: editUserName.trim(), global_role: editUserRole } : u
      ))
      setEditingUser(null)
      showToast('Usuário atualizado', 'success')
    } catch (e) { setError(errMsg(e)) }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserName.trim() || !newUserEmail.trim()) return
    setCreatingUser(true)
    try {
      await createUser(newUserEmail.trim(), newUserName.trim())
      setNewUserName('')
      setNewUserEmail('')
      setShowCreateUser(false)
      loadUsers()
      showToast('Usuário criado com senha Mudar@123', 'success')
    } catch (e) { setError(errMsg(e)) }
    finally { setCreatingUser(false) }
  }

  async function handleToggleActive(u: UserWithSquads) {
    try {
      await toggleUserActive(u.id, !u.active)
      setUsersTab((prev) => prev.map((x) => x.id === u.id ? { ...x, active: !u.active } : x))
    } catch (e) { setError(errMsg(e)) }
  }

  async function handleResetPassword() {
    if (!resetPasswordTarget) return
    try {
      await resetUserPassword(resetPasswordTarget.id)
      setResetPasswordTarget(null)
      showToast('Senha resetada para Mudar@123', 'success')
    } catch (e) { setError(errMsg(e)) }
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleBatchResetPasswords() {
    setBatchResetting(true)
    let ok = 0
    let fail = 0
    for (const id of selectedUserIds) {
      try { await resetUserPassword(id); ok++ }
      catch (e) { if (import.meta.env.DEV) console.warn('[Squads] Failed to reset password for user:', id, e); fail++ }
    }
    setBatchResetting(false)
    setShowBatchResetConfirm(false)
    setSelectedUserIds(new Set())
    if (fail === 0) showToast(`Senha resetada para ${ok} usuário${ok !== 1 ? 's' : ''}`, 'success')
    else showToast(`${ok} resetado${ok !== 1 ? 's' : ''}, ${fail} falha${fail !== 1 ? 's' : ''}`, 'error')
  }

  // ── Permission profile CRUD ───────────────────────────────────────────────────

  function openNewProfile() {
    setEditingProfile(null)
    setProfileName('')
    setProfileDesc('')
    setProfilePerms({ ...DEFAULT_PERMISSIONS })
    setShowProfileForm(true)
  }

  function openEditProfile(p: PermissionProfile) {
    setEditingProfile(p)
    setProfileName(p.name)
    setProfileDesc(p.description)
    setProfilePerms({ ...p.permissions })
    setShowProfileForm(true)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profileName.trim()) return
    setSavingProfile(true)
    try {
      if (editingProfile) {
        await updatePermissionProfile(editingProfile.id, profileName.trim(), profileDesc.trim(), profilePerms)
        setProfiles((prev) => prev.map((p) =>
          p.id === editingProfile.id
            ? { ...p, name: profileName.trim(), description: profileDesc.trim(), permissions: profilePerms }
            : p
        ))
      } else {
        const created = await createPermissionProfile(profileName.trim(), profileDesc.trim(), profilePerms)
        setProfiles((prev) => [...prev, created])
      }
      setShowProfileForm(false)
      showToast(editingProfile ? 'Perfil atualizado' : 'Perfil criado', 'success')
    } catch (e) { setError(errMsg(e)) }
    finally { setSavingProfile(false) }
  }

  async function handleDeleteProfile() {
    if (!deleteProfileTarget) return
    try {
      await deletePermissionProfile(deleteProfileTarget.id)
      setProfiles((prev) => prev.filter((p) => p.id !== deleteProfileTarget.id))
      showToast('Perfil excluído', 'info')
    } catch (e) { setError(errMsg(e)) }
    finally { setDeleteProfileTarget(null) }
  }

  // ── Add member ────────────────────────────────────────────────────────────────

  async function handleAddMember() {
    if (!activeSquad || !addUserId) return
    setAdding(true)
    setAddError('')
    try {
      await addMember(activeSquad.id, addUserId, addRole, addPerms)
      const updated = await listSquadMembers(activeSquad.id)
      setMembers(updated)
      setAddUserId('')
      setAddRole('qa')
      setAddProfileId('')
      setAddPerms({ ...DEFAULT_PERMISSIONS })
      setUserSearch('')
      setShowAddMemberForm(false)
      showToast('Membro adicionado', 'success')
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
      showToast('Permissões salvas', 'success')
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
      showToast('Membro removido', 'info')
    } catch (e) { setError(errMsg(e)) }
    finally { setDeleteMemberTarget(null) }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-10 text-body">Carregando...</div>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      <style>{`
        .sq-btn-archive:hover { background: var(--color-red-light) !important; }
        .sq-btn-remove:hover { background: var(--color-red-light) !important; }
        .sq-dropdown-item:hover { background: var(--color-surface-2) !important; }
      `}</style>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="flex px-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {([
          ['squads',   '👥 Squads'],
          ['profiles', '🔐 Perfis de Acesso'],
          ...(isAdmin ? [['users', '👤 Usuários'] as const] : []),
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className="cursor-pointer" style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--color-blue)' : '2px solid transparent',
            marginBottom: -1,
            color: tab === t ? 'var(--color-blue)' : 'var(--color-text-2)',
            fontWeight: tab === t ? 600 : 400,
            fontSize: 13,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-5 px-6">

        {/* ════ Tab: Squads ════ */}
        {tab === 'squads' && (
          <div className="max-w-[860px]">
            {/* Search + New Squad button */}
            <div className="flex items-center gap-2.5 mb-3.5">
              {squads.length > 0 && (
                <div className="relative flex-1 max-w-80">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-3)' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar squad..."
                    value={squadSearch}
                    onChange={(e) => setSquadSearch(e.target.value)}
                    className="input-field pl-8"
                  />
                </div>
              )}
              <button
                onClick={() => setShowNewSquadForm(!showNewSquadForm)}
                className={`btn btn-md shrink-0 ${showNewSquadForm ? 'btn-outline' : 'btn-primary'}`}
              >
                {showNewSquadForm ? 'Cancelar' : '+ Novo Squad'}
              </button>
            </div>

            {/* Inline new squad form */}
            {showNewSquadForm && (
              <form onSubmit={handleCreate} className="card flex flex-col gap-2.5 mb-3.5" style={{ border: '1px solid var(--color-blue)' }}>
                <div className="heading-sm">Novo Squad</div>
                <div>
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setNewNameError('') }}
                    className="input-field"
                    style={newNameError ? { borderColor: 'var(--color-red-mid)' } : undefined}
                    required
                    placeholder="Nome do squad *"
                    autoFocus
                  />
                  {newNameError && (
                    <div className="text-small mt-1" style={{ color: 'var(--color-red)', fontWeight: 600 }}>
                      {newNameError}
                    </div>
                  )}
                </div>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input-field"
                  placeholder="Descrição (opcional)"
                />
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="btn btn-primary btn-md self-start"
                >
                  {creating ? 'Criando...' : 'Criar Squad'}
                </button>
              </form>
            )}

            {/* Empty state */}
            {squads.length === 0 && !showNewSquadForm && (
              <div className="text-center py-10 px-5 text-muted">
                <div className="text-4xl mb-2.5">👥</div>
                <p className="text-body mb-1.5" style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>Nenhum squad criado</p>
                <p className="text-body">Clique em <strong>+ Novo Squad</strong> para começar.</p>
              </div>
            )}

            {/* Lista de squads como cards expansíveis */}
            <div className="flex flex-col gap-2.5">
              {squads.filter((s) => {
                if (!squadSearch.trim()) return true
                const q = squadSearch.toLowerCase().trim()
                return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
              }).map((s) => {
                const isOpen = activeSquad?.id === s.id
                return (
                  <div key={s.id} className="rounded-xl overflow-hidden" style={{
                    background: 'var(--color-bg)',
                    border: '0.5px solid var(--color-border)',
                    borderLeft: `3px solid ${s.color || 'var(--color-blue)'}`,
                  }}>
                    {/* Card header — clicável */}
                    <button
                      type="button"
                      onClick={() => setActiveSquad(isOpen ? null : s)}
                      className="flex items-center gap-3.5 w-full cursor-pointer text-left"
                      style={{ padding: '14px 18px', background: 'none', border: 'none' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="heading-sm">{s.name}</span>
                          {s.member_count !== undefined && (
                            <span className="text-small text-muted" style={{ fontWeight: 500 }}>
                              {s.member_count} {s.member_count === 1 ? 'membro' : 'membros'}
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <div className="text-small mt-0.5">{s.description}</div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditingSquad(s); setEditName(s.name); setEditDesc(s.description); setEditColor(s.color) }} className="btn btn-ghost">Editar</button>
                          <button
                            onClick={() => setArchiveSquadTarget(s)}
                            className="btn btn-destructive sq-btn-archive"
                          >Arquivar</button>
                        </div>
                      )}
                      <span className="shrink-0 text-muted transition-transform" style={{ fontSize: 16, transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </button>

                    {/* Painel expandido — membros + adicionar */}
                    {isOpen && (
                      <SquadDetail
                        activeSquad={activeSquad!}
                        members={members}
                        membersLoading={membersLoading}
                        currentUserId={user?.id}
                        canManage={canManage}
                        editingPermsMember={editingPermsMember}
                        editingPerms={editingPerms}
                        setEditingPerms={setEditingPerms}
                        setEditingPermsMember={setEditingPermsMember}
                        startEditPerms={startEditPerms}
                        savePerms={savePerms}
                        savingPerms={savingPerms}
                        handleRoleChange={handleRoleChange}
                        setDeleteMemberTarget={setDeleteMemberTarget}
                        showAddMemberForm={showAddMemberForm}
                        setShowAddMemberForm={setShowAddMemberForm}
                        userSearch={userSearch}
                        handleUserSearchChange={handleUserSearchChange}
                        handleUserSearchKeyDown={handleUserSearchKeyDown}
                        addUserId={addUserId}
                        setAddUserId={setAddUserId}
                        setUserSearch={setUserSearch}
                        showUserDropdown={showUserDropdown}
                        setShowUserDropdown={setShowUserDropdown}
                        availableUsers={availableUsers}
                        selectUser={selectUser}
                        addRole={addRole}
                        setAddRole={setAddRole}
                        addProfileId={addProfileId}
                        setAddProfileId={setAddProfileId}
                        setAddPerms={setAddPerms}
                        profiles={profiles}
                        adding={adding}
                        handleAddMember={handleAddMember}
                        addError={addError}
                        dropdownRef={dropdownRef}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* (Form de criação movido para o topo, ao lado da busca) */}

            {/* Squads arquivados — visível para admin */}
            {isAdmin && (
              <div className="mt-7">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1.5 cursor-pointer text-small text-muted"
                  style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600 }}
                >
                  <span className="inline-block transition-transform" style={{
                    transform: showArchived ? 'rotate(90deg)' : 'rotate(0deg)',
                    fontSize: 10,
                  }}>▶</span>
                  Squads arquivados {archivedSquads.length > 0 && `(${archivedSquads.length})`}
                </button>

                {showArchived && (
                  <div className="flex flex-col gap-2 mt-3">
                    {archivedSquads.length === 0 && (
                      <p className="text-small text-muted italic">
                        Nenhum squad arquivado.
                      </p>
                    )}
                    {archivedSquads.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-lg opacity-70" style={{
                        padding: '10px 16px', background: 'var(--color-bg)',
                        border: '0.5px solid var(--color-border)',
                        borderLeft: `3px solid ${s.color || '#6b7280'}`,
                      }}>
                        <div className="flex-1 min-w-0">
                          <span className="text-body" style={{ fontWeight: 500, color: 'var(--color-text)' }}>{s.name}</span>
                          {s.description && (
                            <span className="text-small text-muted ml-2">{s.description}</span>
                          )}
                        </div>
                        <span className="badge badge-neutral" style={{ fontWeight: 600, color: 'var(--color-text-3)' }}>
                          Arquivado
                        </span>
                        <button
                          onClick={() => handleUnarchiveSquad(s)}
                          className="btn btn-ghost"
                          style={{ color: 'var(--color-green)' }}
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ Tab: Perfis de Acesso ════ */}
        {tab === 'profiles' && (
          <ProfilesPanel
            profiles={profiles}
            isAdmin={isAdmin}
            profileSearch={profileSearch}
            setProfileSearch={setProfileSearch}
            openNewProfile={openNewProfile}
            openEditProfile={openEditProfile}
            setDeleteProfileTarget={setDeleteProfileTarget}
          />
        )}

        {/* ════ Tab: Usuários ════ */}
        {tab === 'users' && isAdmin && (
          <UsersPanel
            usersTab={usersTab}
            usersLoading={usersLoading}
            currentUserId={user?.id}
            showCreateUser={showCreateUser}
            setShowCreateUser={setShowCreateUser}
            newUserName={newUserName}
            setNewUserName={setNewUserName}
            newUserEmail={newUserEmail}
            setNewUserEmail={setNewUserEmail}
            creatingUser={creatingUser}
            handleCreateUser={handleCreateUser}
            userTabSearch={userTabSearch}
            setUserTabSearch={setUserTabSearch}
            userFilterRole={userFilterRole}
            setUserFilterRole={setUserFilterRole}
            userFilterStatus={userFilterStatus}
            setUserFilterStatus={setUserFilterStatus}
            selectedUserIds={selectedUserIds}
            toggleUserSelection={toggleUserSelection}
            setSelectedUserIds={setSelectedUserIds}
            setShowBatchResetConfirm={setShowBatchResetConfirm}
            openEditUser={openEditUser}
            setResetPasswordTarget={setResetPasswordTarget}
            handleToggleActive={handleToggleActive}
          />
        )}
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────────── */}

      {editingSquad && (
        <div className="modal-backdrop modal-backdrop-high" onClick={() => setEditingSquad(null)}>
          <div className="modal-container" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-md mb-4">Editar Squad</h3>
            <form onSubmit={handleEditSquad} className="flex flex-col gap-3.5">
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <label className="label-field">Nome</label>
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="label-field">Cor</label>
                  <div className="flex gap-1 flex-wrap">
                    {SQUAD_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setEditColor(c)} className="shrink-0 cursor-pointer transition-[border-color]" style={{
                        width: 28, height: 28, borderRadius: 7, background: c, border: editColor === c ? '2.5px solid var(--color-text)' : '2px solid transparent',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="label-field">Descrição</label>
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input-field" placeholder="Opcional" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditingSquad(null)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={!editName.trim()} className="btn btn-primary btn-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop modal-backdrop-high" onClick={() => setEditingUser(null)}>
          <div className="modal-container modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-md mb-4">Editar Usuário</h3>
            <form onSubmit={handleSaveUser} className="flex flex-col gap-3.5">
              <div><label className="label-field">Nome</label><input autoFocus value={editUserName} onChange={(e) => setEditUserName(e.target.value)} className="input-field" required /></div>
              <div><label className="label-field">E-mail</label><input value={editingUser.email} className="input-field opacity-50" disabled /></div>
              <div><label className="label-field">Perfil global</label>
                <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'gerente' | 'user')} className="select-field">
                  <option value="user">Usuário</option><option value="gerente">Gerente</option><option value="admin">Admin</option>
                </select>
              </div>
              {editingUser.squads.length > 0 && (
                <div>
                  <label className="label-field">Squads</label>
                  <div className="flex flex-wrap gap-1.5">
                    {editingUser.squads.map((sq) => (
                      <span key={sq.squad_id} className="badge badge-neutral" style={{ fontSize: 11, padding: '3px 10px' }}>{sq.squad_name} — {ROLE_LABEL[sq.role]}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={!editUserName.trim()} className="btn btn-primary btn-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {archiveSquadTarget && <ConfirmModal title="Arquivar Squad" description={`Arquivar "${archiveSquadTarget.name}"? O squad não aparecerá mais nas listas. Somente membros do squad e admins poderão visualizar os dados antigos. Você poderá restaurar a qualquer momento.`} confirmLabel="Arquivar" onConfirm={handleArchiveSquad} onCancel={() => setArchiveSquadTarget(null)} />}
      {deleteMemberTarget && <ConfirmModal title={deleteMemberTarget.user_id === user?.id ? 'Sair do Squad' : 'Remover Membro'} description={deleteMemberTarget.user_id === user?.id ? `Sair do squad "${activeSquad?.name}"?` : `Remover ${deleteMemberTarget.profile?.display_name ?? 'este membro'} do squad?`} confirmLabel={deleteMemberTarget.user_id === user?.id ? 'Sair' : 'Remover'} onConfirm={handleRemoveMember} onCancel={() => setDeleteMemberTarget(null)} />}

      {showProfileForm && (
        <div className="modal-backdrop modal-backdrop-high" onClick={() => setShowProfileForm(false)}>
          <div className="modal-container" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-md mb-4">{editingProfile ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}</h3>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5">
              <div><label className="label-field">Nome</label><input autoFocus value={profileName} onChange={(e) => setProfileName(e.target.value)} className="input-field" required placeholder="Ex: QA Júnior, Stakeholder Avançado" /></div>
              <div><label className="label-field">Descrição</label><input value={profileDesc} onChange={(e) => setProfileDesc(e.target.value)} className="input-field" placeholder="Opcional" /></div>
              <PermissionsEditor value={profilePerms} onChange={setProfilePerms} />
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => setShowProfileForm(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={savingProfile || !profileName.trim()} className="btn btn-primary btn-md">{savingProfile ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteProfileTarget && <ConfirmModal title="Excluir Perfil" description={`Excluir "${deleteProfileTarget.name}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" onConfirm={handleDeleteProfile} onCancel={() => setDeleteProfileTarget(null)} />}

      {resetPasswordTarget && <ConfirmModal title="Resetar Senha" description={`Resetar a senha de "${resetPasswordTarget.display_name}" para Mudar@123? O usuário será obrigado a trocar no próximo login.`} confirmLabel="Resetar" onConfirm={handleResetPassword} onCancel={() => setResetPasswordTarget(null)} />}

      {showBatchResetConfirm && (
        <ConfirmModal
          title="Resetar Senha em Lote"
          description={`Resetar a senha de ${selectedUserIds.size} usuário${selectedUserIds.size !== 1 ? 's' : ''} para Mudar@123? Todos serão obrigados a trocar no próximo login.`}
          confirmLabel={batchResetting ? 'Resetando...' : `Resetar ${selectedUserIds.size}`}
          onConfirm={handleBatchResetPasswords}
          onCancel={() => setShowBatchResetConfirm(false)}
        />
      )}

      {error && (
        <div className="msg-error fixed bottom-5 right-5 z-[9999] max-w-[300px]">
          {error}
          <button onClick={() => setError('')} className="ml-2 cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--color-red)', fontWeight: 700 }}>×</button>
        </div>
      )}
    </div>
  )
}

