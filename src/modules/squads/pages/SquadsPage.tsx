import { useState, useEffect, useCallback, useRef } from 'react'
import {
  listMySquads, createSquad, updateSquad,
  listSquadMembers, addMember, updateMemberRole, updateMemberPermissions,
  removeMember, getMyRole, listAllUsers,
  listAllUsersWithSquads, createUser, updateUserProfile, toggleUserActive, resetUserPassword,
  listPermissionProfiles, createPermissionProfile, updatePermissionProfile, deletePermissionProfile,
  archiveSquad, unarchiveSquad, listArchivedSquads,
  DEFAULT_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS, PERMISSION_RESOURCES, RESOURCE_LABELS,
  type Squad, type SquadMember, type SquadRole, type MemberPermissions, type PermissionProfile,
  type PermissionGroup,
  type UserWithSquads,
} from '../services/squadsService'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { useAuthStore } from '@/modules/auth/store/authStore'
import type { Profile } from '@/modules/auth/store/authStore'
import { useActiveSquadStore } from '../store/activeSquadStore'
import { PermissionsEditor } from '../components/PermissionsEditor'
import { ProfilesPanel } from '../components/ProfilesPanel'
import { UsersPanel } from '../components/UsersPanel'
import { SquadDetail } from '../components/SquadDetail'
import { ApiKeysPanel } from '../components/ApiKeysPanel'
import { AuditTrailPanel } from '../components/AuditTrailPanel'

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

const roleBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8,
  background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)',
}

// ─── SquadsPage ────────────────────────────────────────────────────────────────

export function SquadsPage() {
  const { user, profile: myProfile } = useAuthStore()
  const isAdmin = myProfile?.global_role === 'admin' || myProfile?.global_role === 'gerente'

  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSquad, setActiveSquad] = useState<Squad | null>(null)
  const [tab, setTab] = useState<'squads' | 'profiles' | 'users' | 'apikeys' | 'audit'>('squads')

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
      useActiveSquadStore.getState().loadSquads()
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
      useActiveSquadStore.getState().loadSquads()
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
      useActiveSquadStore.getState().loadSquads()
    } catch (e) { setError(errMsg(e)) }
    finally { setArchiveSquadTarget(null) }
  }

  async function handleUnarchiveSquad(squad: Squad) {
    try {
      await unarchiveSquad(squad.id)
      setArchivedSquads((prev) => prev.filter((s) => s.id !== squad.id))
      setSquads((prev) => [...prev, { ...squad, archived: false }])
      showToast(`"${squad.name}" restaurado`, 'success')
      useActiveSquadStore.getState().loadSquads()
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
    <div style={{ padding: 40, color: 'var(--color-text-2)', fontSize: 14 }}>Carregando...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`
        .sq-btn-archive:hover { background: var(--color-red-light) !important; }
        .sq-btn-remove:hover { background: var(--color-red-light) !important; }
        .sq-dropdown-item:hover { background: var(--color-surface-2) !important; }
      `}</style>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
        {([
          ['squads',   '👥 Squads'],
          ['profiles', '🔐 Perfis de Acesso'],
          ...(isAdmin ? [['users', '👤 Usuários'] as const] : []),
          ...(isAdmin ? [['apikeys', '🔑 API Keys'] as const] : []),
          ...(isAdmin ? [['audit', '📋 Audit Trail'] as const] : []),
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} role="tab" aria-selected={tab === t} style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--color-blue)' : '2px solid transparent',
            marginBottom: -1,
            color: tab === t ? 'var(--color-blue)' : 'var(--color-text-2)',
            fontWeight: tab === t ? 600 : 400,
            fontSize: 13, cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* ════ Tab: Squads ════ */}
        {tab === 'squads' && (
          <div style={{ maxWidth: 860 }}>
            {/* Search + New Squad button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {squads.length > 0 && (
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar squad..."
                    value={squadSearch}
                    onChange={(e) => setSquadSearch(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
                  />
                </div>
              )}
              <button
                onClick={() => setShowNewSquadForm(!showNewSquadForm)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: showNewSquadForm ? 'var(--color-surface-2)' : 'var(--color-blue)',
                  color: showNewSquadForm ? 'var(--color-text-2)' : '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {showNewSquadForm ? 'Cancelar' : '+ Novo Squad'}
              </button>
            </div>

            {/* Inline new squad form */}
            {showNewSquadForm && (
              <form onSubmit={handleCreate} style={{
                padding: '16px 18px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-blue)',
                borderRadius: 10,
                marginBottom: 14,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Novo Squad</div>
                <div>
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setNewNameError('') }}
                    style={{ ...inputStyle, width: '100%', borderColor: newNameError ? 'var(--color-red-mid)' : undefined }}
                    required
                    placeholder="Nome do squad *"
                    autoFocus
                  />
                  {newNameError && (
                    <div style={{ fontSize: 12, color: 'var(--color-red)', marginTop: 4, fontWeight: 600 }}>
                      {newNameError}
                    </div>
                  )}
                </div>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="Descrição (opcional)"
                />
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  style={{
                    ...btnPrimary, alignSelf: 'flex-start',
                    opacity: creating || !newName.trim() ? 0.5 : 1,
                  }}
                >
                  {creating ? 'Criando...' : 'Criar Squad'}
                </button>
              </form>
            )}

            {/* Empty state */}
            {squads.length === 0 && !showNewSquadForm && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-3)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 6px' }}>Nenhum squad criado</p>
                <p style={{ fontSize: 13, margin: 0 }}>Clique em <strong>+ Novo Squad</strong> para começar.</p>
              </div>
            )}

            {/* Lista de squads como cards expansíveis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {squads.filter((s) => {
                if (!squadSearch.trim()) return true
                const q = squadSearch.toLowerCase().trim()
                return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
              }).map((s) => {
                const isOpen = activeSquad?.id === s.id
                return (
                  <div key={s.id} style={{
                    background: 'var(--color-bg)',
                    border: '0.5px solid var(--color-border)',
                    borderLeft: `3px solid ${s.color || 'var(--color-blue)'}`,
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    {/* Card header — clicável */}
                    <button
                      type="button"
                      onClick={() => setActiveSquad(isOpen ? null : s)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Recolher' : 'Expandir'} squad ${s.name}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px', width: '100%',
                        background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{s.name}</span>
                          {s.member_count !== undefined && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>
                              {s.member_count} {s.member_count === 1 ? 'membro' : 'membros'}
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>{s.description}</div>
                        )}
                      </div>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditingSquad(s); setEditName(s.name); setEditDesc(s.description); setEditColor(s.color) }} style={btnGhost}>Editar</button>
                          <button
                            onClick={() => setArchiveSquadTarget(s)}
                            style={btnDestructive}
                            className="sq-btn-archive"
                          >Arquivar</button>
                        </div>
                      )}
                      <span style={{ fontSize: 16, color: 'var(--color-text-3)', flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
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
              <div style={{ marginTop: 28 }}>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  aria-expanded={showArchived}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)',
                    padding: 0, fontFamily: 'var(--font-family-sans)',
                  }}
                >
                  <span style={{
                    display: 'inline-block', transition: 'transform 0.15s',
                    transform: showArchived ? 'rotate(90deg)' : 'rotate(0deg)',
                    fontSize: 10,
                  }}>▶</span>
                  Squads arquivados {archivedSquads.length > 0 && `(${archivedSquads.length})`}
                </button>

                {showArchived && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {archivedSquads.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
                        Nenhum squad arquivado.
                      </p>
                    )}
                    {archivedSquads.map((s) => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px', background: 'var(--color-bg)',
                        border: '0.5px solid var(--color-border)',
                        borderLeft: `3px solid ${s.color || '#6b7280'}`,
                        borderRadius: 10, opacity: 0.7,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{s.name}</span>
                          {s.description && (
                            <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 8 }}>{s.description}</span>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                          background: 'var(--color-surface-2)', color: 'var(--color-text-3)',
                        }}>
                          Arquivado
                        </span>
                        <button
                          onClick={() => handleUnarchiveSquad(s)}
                          style={{ ...btnGhost, color: 'var(--color-green)', fontSize: 12 }}
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

        {/* ════ Tab: API Keys ════ */}
        {tab === 'apikeys' && isAdmin && (
          <ApiKeysPanel />
        )}

        {/* ════ Tab: Audit Trail ════ */}
        {tab === 'audit' && isAdmin && (
          <AuditTrailPanel />
        )}
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────────── */}

      {editingSquad && (
        <div style={backdropStyle} onClick={() => setEditingSquad(null)}>
          <div style={{ ...modalStyle, width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 500 }}>Editar Squad</h3>
            <form onSubmit={handleEditSquad} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelSm}>Nome</label>
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelSm}>Cor</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {SQUAD_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setEditColor(c)} aria-label={`Cor ${c}`} aria-pressed={editColor === c} style={{
                        width: 28, height: 28, borderRadius: 7, background: c, border: editColor === c ? '2.5px solid var(--color-text)' : '2px solid transparent',
                        cursor: 'pointer', transition: 'border-color 0.15s', flexShrink: 0,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={labelSm}>Descrição</label>
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={inputStyle} placeholder="Opcional" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingSquad(null)} style={btnGhost}>Cancelar</button>
                <button type="submit" disabled={!editName.trim()} style={btnPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div style={backdropStyle} onClick={() => setEditingUser(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 500 }}>Editar Usuário</h3>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelSm}>Nome</label><input autoFocus value={editUserName} onChange={(e) => setEditUserName(e.target.value)} style={inputStyle} required /></div>
              <div><label style={labelSm}>E-mail</label><input value={editingUser.email} style={{ ...inputStyle, opacity: 0.5 }} disabled /></div>
              <div><label style={labelSm}>Perfil global</label>
                <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'gerente' | 'user')} style={selectStyle}>
                  <option value="user">Usuário</option><option value="gerente">Gerente</option><option value="admin">Admin</option>
                </select>
              </div>
              {editingUser.squads.length > 0 && (
                <div>
                  <label style={labelSm}>Squads</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {editingUser.squads.map((sq) => (
                      <span key={sq.squad_id} style={{ ...badgeNeutral, fontSize: 11, padding: '3px 10px' }}>{sq.squad_name} — {ROLE_LABEL[sq.role]}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={btnGhost}>Cancelar</button>
                <button type="submit" disabled={!editUserName.trim()} style={btnPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {archiveSquadTarget && <ConfirmModal title="Arquivar Squad" description={`Arquivar "${archiveSquadTarget.name}"? O squad não aparecerá mais nas listas. Somente membros do squad e admins poderão visualizar os dados antigos. Você poderá restaurar a qualquer momento.`} confirmLabel="Arquivar" onConfirm={handleArchiveSquad} onCancel={() => setArchiveSquadTarget(null)} />}
      {deleteMemberTarget && <ConfirmModal title={deleteMemberTarget.user_id === user?.id ? 'Sair do Squad' : 'Remover Membro'} description={deleteMemberTarget.user_id === user?.id ? `Sair do squad "${activeSquad?.name}"?` : `Remover ${deleteMemberTarget.profile?.display_name ?? 'este membro'} do squad?`} confirmLabel={deleteMemberTarget.user_id === user?.id ? 'Sair' : 'Remover'} onConfirm={handleRemoveMember} onCancel={() => setDeleteMemberTarget(null)} />}

      {showProfileForm && (
        <div style={backdropStyle} onClick={() => setShowProfileForm(false)}>
          <div style={{ ...modalStyle, width: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 500 }}>{editingProfile ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}</h3>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelSm}>Nome</label><input autoFocus value={profileName} onChange={(e) => setProfileName(e.target.value)} style={inputStyle} required placeholder="Ex: QA Júnior, Stakeholder Avançado" /></div>
              <div><label style={labelSm}>Descrição</label><input value={profileDesc} onChange={(e) => setProfileDesc(e.target.value)} style={inputStyle} placeholder="Opcional" /></div>
              <PermissionsEditor value={profilePerms} onChange={setProfilePerms} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowProfileForm(false)} style={btnGhost}>Cancelar</button>
                <button type="submit" disabled={savingProfile || !profileName.trim()} style={{ ...btnPrimary, opacity: savingProfile || !profileName.trim() ? 0.5 : 1 }}>{savingProfile ? 'Salvando...' : 'Salvar'}</button>
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
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--color-red-light)', border: '1px solid var(--color-red-mid)', color: 'var(--color-red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, zIndex: 9999, maxWidth: 300 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-red)', fontWeight: 700 }}>×</button>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = { padding: '7px 16px', background: 'var(--color-blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '5px 10px', background: 'none', color: 'var(--color-text-2)', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }
const btnDestructive: React.CSSProperties = { padding: '5px 10px', background: 'none', color: 'var(--color-red)', border: '1px solid var(--color-red-light)', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', outline: 'none' }
const selectStyle: React.CSSProperties = {
  ...inputStyle, padding: '8px 28px 8px 12px', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
}
const labelSm: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)', marginBottom: 6 }
const badgeNeutral: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' }
const badgeActive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-green-light)', color: 'var(--color-green)', border: '0.5px solid var(--color-green-mid)' }
const badgeInactive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-red-light)', color: 'var(--color-red)', border: '0.5px solid var(--color-red-mid)' }
const avatarBase: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', background: 'var(--color-blue-light)', color: 'var(--color-blue)', border: '0.5px solid var(--color-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }
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
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }
const modalStyle: React.CSSProperties = { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '24px 22px', width: 360, maxWidth: '90vw', boxShadow: 'var(--shadow-xl)' }
const colorInputStyle: React.CSSProperties = { width: 36, height: 36, padding: 2, border: '0.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', background: 'var(--color-bg)' }
