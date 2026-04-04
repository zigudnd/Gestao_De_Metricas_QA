import type { UserWithSquads } from '../services/squadsService'
import { inputStyle, selectStyle, btnPrimary, btnGhost, labelSm, avatarBase } from '@/styles/shared'

const btnDestructive: React.CSSProperties = { padding: '5px 10px', background: 'none', color: '#A32D2D', border: '1px solid var(--color-red-light)', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' }
const badgeNeutral: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' }
const badgeActive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-green-light)', color: 'var(--color-green)', border: '0.5px solid var(--color-green-mid)' }
const badgeInactive: React.CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: 'var(--color-red-light)', color: 'var(--color-red)', border: '0.5px solid var(--color-red-mid)' }

export interface UsersPanelProps {
  usersTab: UserWithSquads[]
  usersLoading: boolean
  currentUserId: string | undefined
  showCreateUser: boolean
  setShowCreateUser: (v: boolean) => void
  newUserName: string
  setNewUserName: (v: string) => void
  newUserEmail: string
  setNewUserEmail: (v: string) => void
  creatingUser: boolean
  handleCreateUser: (e: React.FormEvent) => void
  userTabSearch: string
  setUserTabSearch: (v: string) => void
  userFilterRole: 'all' | 'admin' | 'gerente' | 'user'
  setUserFilterRole: (v: 'all' | 'admin' | 'gerente' | 'user') => void
  userFilterStatus: 'all' | 'active' | 'inactive'
  setUserFilterStatus: (v: 'all' | 'active' | 'inactive') => void
  selectedUserIds: Set<string>
  toggleUserSelection: (userId: string) => void
  setSelectedUserIds: (v: Set<string>) => void
  setShowBatchResetConfirm: (v: boolean) => void
  openEditUser: (u: UserWithSquads) => void
  setResetPasswordTarget: (u: UserWithSquads | null) => void
  handleToggleActive: (u: UserWithSquads) => void
}

export function UsersPanel({
  usersTab,
  usersLoading,
  currentUserId,
  showCreateUser,
  setShowCreateUser,
  newUserName,
  setNewUserName,
  newUserEmail,
  setNewUserEmail,
  creatingUser,
  handleCreateUser,
  userTabSearch,
  setUserTabSearch,
  userFilterRole,
  setUserFilterRole,
  userFilterStatus,
  setUserFilterStatus,
  selectedUserIds,
  toggleUserSelection,
  setSelectedUserIds,
  setShowBatchResetConfirm,
  openEditUser,
  setResetPasswordTarget,
  handleToggleActive,
}: UsersPanelProps) {
  return (
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
            <select value={userFilterRole} onChange={(e) => setUserFilterRole(e.target.value as 'all' | 'admin' | 'gerente' | 'user')} style={{ ...selectStyle, width: 'auto' }}>
              <option value="all">Todos os perfis</option>
              <option value="admin">Admin</option>
              <option value="gerente">Gerente</option>
              <option value="user">Usuario</option>
            </select>
            {/* Filter: status */}
            <select value={userFilterStatus} onChange={(e) => setUserFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} style={{ ...selectStyle, width: 'auto' }}>
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 'auto' }}>
              {usersTab.length} usuário{usersTab.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {/* Toolbar de ações em lote */}
        {selectedUserIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', marginBottom: 10,
            background: 'var(--color-blue-light)',
            border: '1px solid var(--color-blue)',
            borderRadius: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-blue-text)' }}>
              {selectedUserIds.size} selecionado{selectedUserIds.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowBatchResetConfirm(true)}
              style={{
                padding: '5px 14px', borderRadius: 7, border: 'none',
                background: 'var(--color-blue)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              🔑 Resetar senha ({selectedUserIds.size})
            </button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              style={{
                padding: '5px 12px', borderRadius: 7,
                border: '1px solid var(--color-blue)',
                background: 'transparent', color: 'var(--color-blue-text)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              Limpar seleção
            </button>
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
              {/* Checkbox para seleção em lote */}
              {u.id !== currentUserId && (
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(u.id)}
                  onChange={() => toggleUserSelection(u.id)}
                  aria-label={`Selecionar ${u.display_name}`}
                  style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: 'var(--color-blue)' }}
                />
              )}
              {/* Avatar + info */}
              <div style={avatarBase}>{u.display_name[0]?.toUpperCase() ?? '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{u.display_name}</span>
                  <span style={badgeNeutral}>{u.global_role === 'admin' ? 'Admin' : u.global_role === 'gerente' ? 'Gerente' : 'Usuario'}</span>
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
                {u.id !== currentUserId && (
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
  )
}
