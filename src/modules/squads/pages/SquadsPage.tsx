import { useState, useEffect, useCallback, useRef } from 'react'
import {
  listMySquads, createSquad, updateSquad, deleteSquad,
  listSquadMembers, addMember, updateMemberRole, updateMemberPermissions,
  removeMember, getMyRole, listAllUsers,
  listAllUsersWithSquads, createUser, updateUserProfile, toggleUserActive, resetUserPassword,
  listPermissionProfiles, createPermissionProfile, updatePermissionProfile, deletePermissionProfile,
  DEFAULT_PERMISSIONS, PERMISSION_LABELS,
  type Squad, type SquadMember, type SquadRole, type MemberPermissions, type PermissionProfile,
  type UserWithSquads,
} from '../services/squadsService'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
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

const SQUAD_COLORS = ['#185FA5', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777', '#4F46E5', '#0D9488', '#CA8A04']

const roleBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8,
  background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)',
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
      border: '0.5px solid var(--color-border)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)', marginBottom: 2 }}>
        Permissões de exclusão
      </span>
      {(Object.keys(PERMISSION_LABELS) as (keyof MemberPermissions)[]).map((key) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
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
  const [deleteSquadTarget, setDeleteSquadTarget] = useState<Squad | null>(null)
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<SquadMember | null>(null)

  // Users tab (admin)
  const [usersTab, setUsersTab] = useState<UserWithSquads[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithSquads | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserRole, setEditUserRole] = useState<'admin' | 'user'>('user')
  // Create user form
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserWithSquads | null>(null)

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
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'admin' | 'user'>('all')
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
      if (data.length > 0 && !activeSquad) setActiveSquad(data[0])
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [activeSquad])

  useEffect(() => { loadSquads() }, []) // eslint-disable-line

  // ── Load permission profiles independently ─────────────────────────────────
  useEffect(() => {
    listPermissionProfiles().then(setProfiles).catch(() => {})
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const autoColor = SQUAD_COLORS[squads.length % SQUAD_COLORS.length]
      const squad = await createSquad(newName.trim(), newDesc.trim(), autoColor)
      setSquads((prev) => [...prev, squad])
      setActiveSquad(squad)
      setNewName('')
      setNewDesc('')
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

  async function handleDeleteSquad() {
    if (!deleteSquadTarget) return
    try {
      await deleteSquad(deleteSquadTarget.id)
      const updated = squads.filter((s) => s.id !== deleteSquadTarget.id)
      setSquads(updated)
      if (activeSquad?.id === deleteSquadTarget.id) setActiveSquad(updated[0] ?? null)
      showToast('Squad excluído', 'info')
    } catch (e) { setError(errMsg(e)) }
    finally { setDeleteSquadTarget(null) }
  }

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

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
        {([
          ['squads',   '👥 Squads'],
          ['profiles', '🔐 Perfis de Acesso'],
          ...(isAdmin ? [['users', '👤 Usuários'] as const] : []),
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid #185FA5' : '2px solid transparent',
            marginBottom: -1,
            color: tab === t ? '#185FA5' : 'var(--color-text-2)',
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
            {squads.length > 0 && (
              <div style={{ position: 'relative', marginBottom: 14, maxWidth: 320 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-3)', pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar squad..."
                  value={squadSearch}
                  onChange={(e) => setSquadSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
                />
              </div>
            )}
            {/* Empty state */}
            {squads.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-3)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 6px' }}>Nenhum squad criado</p>
                <p style={{ fontSize: 13, margin: 0 }}>Crie seu primeiro squad para organizar a equipe.</p>
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
                    borderLeft: `3px solid ${s.color || '#185FA5'}`,
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    {/* Card header — clicável */}
                    <button
                      type="button"
                      onClick={() => setActiveSquad(isOpen ? null : s)}
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
                            onClick={() => setDeleteSquadTarget(s)}
                            style={btnDestructive}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FCEBEB' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                          >Excluir</button>
                        </div>
                      )}
                      <span style={{ fontSize: 16, color: 'var(--color-text-3)', flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </button>

                    {/* Painel expandido — membros + adicionar */}
                    {isOpen && (
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
                                  const isMe = m.user_id === user?.id
                                  const isAdminMember = m.profile?.global_role === 'admin'
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
                                          <select value={m.role} onChange={(e) => handleRoleChange(m, e.target.value as SquadRole)} style={{ ...roleBadge, cursor: 'pointer', outline: 'none' }}>
                                            <option value="qa_lead">QA Lead</option>
                                            <option value="qa">QA</option>
                                            <option value="stakeholder">Stakeholder</option>
                                          </select>
                                        ) : (
                                          <span style={roleBadge}>{isAdminMember ? 'Admin' : ROLE_LABEL[m.role]}</span>
                                        )}
                                        {canManage && !isAdminMember && (
                                          <button onClick={() => isEditingP ? setEditingPermsMember(null) : startEditPerms(m)} style={{ ...btnGhost, color: isEditingP ? '#185FA5' : undefined }}>
                                            {isEditingP ? 'Fechar' : 'Permissões'}
                                          </button>
                                        )}
                                        {(canManage || isMe) && !isAdminMember && (
                                          <button
                                            onClick={() => setDeleteMemberTarget(m)}
                                            title={isMe ? 'Sair' : 'Remover'}
                                            style={{ background: 'none', border: 'none', color: '#A32D2D', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FCEBEB' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
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
                                  <button onClick={() => setShowAddMemberForm(true)} style={{ ...btnGhost, color: '#185FA5', fontSize: 13, padding: '6px 0' }}>
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
                                        ...(addUserId ? { borderColor: '#185FA5', background: 'var(--color-blue-light)' } : {}),
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
                                            style={{
                                              display: 'flex', alignItems: 'center', gap: 8,
                                              width: '100%', padding: '8px 12px',
                                              background: 'var(--color-bg)',
                                              borderBottom: '0.5px solid var(--color-border)',
                                              cursor: 'pointer',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg)' }}
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
                                      style={{ ...inputStyle, width: 'auto', minWidth: 120 }}
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
                                      style={{ ...inputStyle, width: 'auto', flex: 1 }}
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
                    )}
                  </div>
                )
              })}
            </div>

            {/* Criar squad */}
            <div style={{ marginTop: 24 }}>
              <span style={labelSm}>Novo Squad</span>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} required placeholder="Nome do squad" />
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={inputStyle} placeholder="Descrição (opcional)" />
                <button type="submit" disabled={creating || !newName.trim()} style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: creating || !newName.trim() ? 0.5 : 1 }}>
                  {creating ? 'Criando...' : 'Criar Squad'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ════ Tab: Perfis de Acesso ════ */}
        {tab === 'profiles' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)' }}>
                Perfis definem conjuntos de permissões reutilizáveis.
              </p>
              {isAdmin && (
                <button onClick={openNewProfile} style={{ ...btnPrimary, flexShrink: 0, marginLeft: 12 }}>+ Novo Perfil</button>
              )}
            </div>
            {profiles.length > 0 && (
              <div style={{ position: 'relative', marginBottom: 14, maxWidth: 320 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-3)', pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar perfil..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profiles.filter((p) => {
                if (!profileSearch.trim()) return true
                const q = profileSearch.toLowerCase().trim()
                return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
              }).map((p) => (
                <div key={p.id} style={{
                  background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
                  borderLeft: p.is_system ? '3px solid #185FA5' : '3px solid var(--color-border)',
                  borderRadius: 12, padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{p.name}</span>
                        {p.is_system && <span style={badgeNeutral}>PADRÃO</span>}
                      </div>
                      {p.description && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-2)' }}>{p.description}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(Object.keys(PERMISSION_LABELS) as (keyof MemberPermissions)[]).map((key) => (
                          <span key={key} style={p.permissions[key] ? badgeActive : badgeNeutral}>
                            {p.permissions[key] ? '✓' : '✗'} {PERMISSION_LABELS[key].replace('Excluir ', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                    {isAdmin && !p.is_system && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEditProfile(p)} style={btnGhost}>Editar</button>
                        <button onClick={() => setDeleteProfileTarget(p)} style={btnDestructive}>Excluir</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ Tab: Usuários ════ */}
        {tab === 'users' && isAdmin && (
          <div style={{ maxWidth: 860 }}>
            {/* Botão + form de criar usuário */}
            <div style={{ marginBottom: 16 }}>
              {!showCreateUser ? (
                <button onClick={() => setShowCreateUser(true)} style={btnPrimary}>+ Novo Usuário</button>
              ) : (
                <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '16px 18px' }}>
                  <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label style={labelSm}>Nome</label>
                      <input autoFocus value={newUserName} onChange={(e) => setNewUserName(e.target.value)} style={inputStyle} required placeholder="Nome completo" />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label style={labelSm}>E-mail</label>
                      <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} style={inputStyle} required placeholder="email@empresa.com" />
                    </div>
                    <button type="submit" disabled={creatingUser} style={{ ...btnPrimary, opacity: creatingUser ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                      {creatingUser ? 'Criando...' : 'Criar'}
                    </button>
                    <button type="button" onClick={() => setShowCreateUser(false)} style={btnGhost}>Cancelar</button>
                  </form>
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
                    * Senha padrão: <strong style={{ color: 'var(--color-text-2)' }}>Mudar@123</strong> — o usuário será solicitado a trocar no primeiro login.
                  </p>
                </div>
              )}
            </div>

            {usersLoading ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Carregando...</p>
            ) : (
              <>
              {usersTab.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 320 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-3)', pointerEvents: 'none' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar usuário..."
                      value={userTabSearch}
                      onChange={(e) => setUserTabSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
                    />
                  </div>
                  {/* Filter: role */}
                  <select value={userFilterRole} onChange={(e) => setUserFilterRole(e.target.value as 'all' | 'admin' | 'user')} style={{ ...inputStyle, width: 'auto' }}>
                    <option value="all">Todos os perfis</option>
                    <option value="admin">Admin</option>
                    <option value="user">Usuário</option>
                  </select>
                  {/* Filter: status */}
                  <select value={userFilterStatus} onChange={(e) => setUserFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} style={{ ...inputStyle, width: 'auto' }}>
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 'auto' }}>
                    {usersTab.length} usuário{usersTab.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {usersTab.filter((u) => {
                  if (userFilterRole !== 'all' && u.global_role !== userFilterRole) return false
                  if (userFilterStatus === 'active' && !u.active) return false
                  if (userFilterStatus === 'inactive' && u.active) return false
                  if (!userTabSearch.trim()) return true
                  const q = userTabSearch.toLowerCase().trim()
                  return u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                    || u.squads.some((sq) => sq.squad_name.toLowerCase().includes(q))
                }).map((u) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px',
                    background: 'var(--color-bg)',
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 12,
                    opacity: u.active ? 1 : 0.5,
                  }}>
                    {/* Avatar + info */}
                    <div style={avatarBase}>{u.display_name[0]?.toUpperCase() ?? '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{u.display_name}</span>
                        <span style={badgeNeutral}>{u.global_role === 'admin' ? 'Admin' : 'Usuário'}</span>
                        <span style={u.active ? badgeActive : badgeInactive}>{u.active ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{u.email}</div>
                      {u.squads.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {u.squads.map((sq) => <span key={sq.squad_id} style={badgeNeutral}>{sq.squad_name}</span>)}
                        </div>
                      )}
                    </div>
                    {/* Ações */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEditUser(u)} style={btnGhost}>Editar</button>
                      {u.id !== user?.id && (
                        <>
                          <button onClick={() => setResetPasswordTarget(u)} style={btnGhost} title="Resetar senha para Mudar@123">🔑 Resetar</button>
                          <button onClick={() => handleToggleActive(u)} style={u.active ? btnDestructive : { ...btnGhost, color: '#3B6D11' }}>
                            {u.active ? 'Desativar' : 'Ativar'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
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
                      <button key={c} type="button" onClick={() => setEditColor(c)} style={{
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
                <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'user')} style={inputStyle}>
                  <option value="user">Usuário</option><option value="admin">Admin</option>
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

      {deleteSquadTarget && <ConfirmModal title="Excluir Squad" description={`Excluir "${deleteSquadTarget.name}"? Todos os membros serão removidos.`} confirmLabel="Excluir" onConfirm={handleDeleteSquad} onCancel={() => setDeleteSquadTarget(null)} />}
      {deleteMemberTarget && <ConfirmModal title={deleteMemberTarget.user_id === user?.id ? 'Sair do Squad' : 'Remover Membro'} description={deleteMemberTarget.user_id === user?.id ? `Sair do squad "${activeSquad?.name}"?` : `Remover ${deleteMemberTarget.profile?.display_name ?? 'este membro'} do squad?`} confirmLabel={deleteMemberTarget.user_id === user?.id ? 'Sair' : 'Remover'} onConfirm={handleRemoveMember} onCancel={() => setDeleteMemberTarget(null)} />}

      {showProfileForm && (
        <div style={backdropStyle} onClick={() => setShowProfileForm(false)}>
          <div style={{ ...modalStyle, width: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 500 }}>{editingProfile ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}</h3>
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

const btnPrimary: React.CSSProperties = { padding: '7px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '5px 10px', background: 'none', color: 'var(--color-text-2)', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }
const btnDestructive: React.CSSProperties = { padding: '5px 10px', background: 'none', color: '#A32D2D', border: '1px solid var(--color-red-light)', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', outline: 'none' }
const labelSm: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-2)', marginBottom: 6 }
const badgeNeutral: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' }
const badgeActive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' }
const badgeInactive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' }
const avatarBase: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', background: '#E6F1FB', color: '#185FA5', border: '0.5px solid #B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }
const AVATAR_STYLES: Record<string, React.CSSProperties> = {
  admin:       { background: '#FEF3C7', color: '#B45309', border: '0.5px solid #FCD34D' },
  qa_lead:     { background: '#E6F1FB', color: '#0c447c', border: '0.5px solid #93C5FD' },
  qa:          { background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' },
  stakeholder: { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' },
}
function avatarStyle(role?: string, isAdmin?: boolean): React.CSSProperties {
  if (isAdmin) return { ...avatarBase, ...AVATAR_STYLES.admin }
  return { ...avatarBase, ...(AVATAR_STYLES[role || 'qa'] || {}) }
}
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }
const modalStyle: React.CSSProperties = { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '24px 22px', width: 360, maxWidth: '90vw', boxShadow: 'var(--shadow-xl)' }
const colorInputStyle: React.CSSProperties = { width: 36, height: 36, padding: 2, border: '0.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', background: 'var(--color-bg)' }
