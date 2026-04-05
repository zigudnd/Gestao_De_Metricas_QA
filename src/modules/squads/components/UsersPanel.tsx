import type { UserWithSquads } from '../services/squadsService'

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
    <div className="max-w-[860px]">
      {/* Botão + form de criar usuário */}
      <div className="mb-4">
        {!showCreateUser ? (
          <button onClick={() => setShowCreateUser(true)} className="btn btn-primary btn-md">+ Novo Usuário</button>
        ) : (
          <div className="card">
            <form onSubmit={handleCreateUser} className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="label-field">Nome</label>
                <input autoFocus value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="input-field" required placeholder="Nome completo" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="label-field">E-mail</label>
                <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="input-field" required placeholder="email@empresa.com" />
              </div>
              <button type="submit" disabled={creatingUser} className="btn btn-primary btn-md">
                {creatingUser ? 'Criando...' : 'Criar'}
              </button>
              <button type="button" onClick={() => setShowCreateUser(false)} className="btn btn-ghost">Cancelar</button>
            </form>
            <p className="text-small text-muted mt-2.5">
              * Senha padrão: <strong style={{ color: 'var(--color-text-2)' }}>Mudar@123</strong> — o usuário será solicitado a trocar no primeiro login.
            </p>
          </div>
        )}
      </div>

      {usersLoading ? (
        <p className="text-body">Carregando...</p>
      ) : (
        <>
        {usersTab.length > 0 && (
          <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-80">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted" style={{ fontSize: 14 }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar usuário..."
                value={userTabSearch}
                onChange={(e) => setUserTabSearch(e.target.value)}
                className="input-field pl-8 w-full"
              />
            </div>
            {/* Filter: role */}
            <select value={userFilterRole} onChange={(e) => setUserFilterRole(e.target.value as 'all' | 'admin' | 'gerente' | 'user')} className="select-field w-auto">
              <option value="all">Todos os perfis</option>
              <option value="admin">Admin</option>
              <option value="gerente">Gerente</option>
              <option value="user">Usuário</option>
            </select>
            {/* Filter: status */}
            <select value={userFilterStatus} onChange={(e) => setUserFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} className="select-field w-auto">
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <span className="text-small text-muted ml-auto">
              {usersTab.length} usuário{usersTab.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {/* Toolbar de ações em lote */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg mb-2.5" style={{
            padding: '10px 16px',
            background: 'var(--color-blue-light)',
            border: '1px solid var(--color-blue)',
          }}>
            <span className="text-body" style={{ fontWeight: 600, color: 'var(--color-blue-text)' }}>
              {selectedUserIds.size} selecionado{selectedUserIds.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowBatchResetConfirm(true)}
              className="btn btn-sm btn-primary"
              style={{ fontWeight: 600 }}
            >
              🔑 Resetar senha ({selectedUserIds.size})
            </button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="btn btn-sm btn-outline"
              style={{ borderColor: 'var(--color-blue)', color: 'var(--color-blue-text)', fontWeight: 600 }}
            >
              Limpar seleção
            </button>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {usersTab.filter((u) => {
            if (userFilterRole !== 'all' && u.global_role !== userFilterRole) return false
            if (userFilterStatus === 'active' && !u.active) return false
            if (userFilterStatus === 'inactive' && u.active) return false
            if (!userTabSearch.trim()) return true
            const q = userTabSearch.toLowerCase().trim()
            return u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
              || u.squads.some((sq) => sq.squad_name.toLowerCase().includes(q))
          }).map((u) => (
            <div key={u.id} className="flex items-center gap-3.5 rounded-xl" style={{
              padding: '12px 16px',
              background: 'var(--color-bg)',
              border: '0.5px solid var(--color-border)',
              opacity: u.active ? 1 : 0.5,
            }}>
              {/* Checkbox para seleção em lote */}
              {u.id !== currentUserId && (
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(u.id)}
                  onChange={() => toggleUserSelection(u.id)}
                  aria-label={`Selecionar ${u.display_name}`}
                  className="shrink-0 cursor-pointer"
                  style={{ width: 16, height: 16, accentColor: 'var(--color-blue)' }}
                />
              )}
              {/* Avatar + info */}
              <div className="avatar">{u.display_name[0]?.toUpperCase() ?? '?'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body" style={{ fontWeight: 500, color: 'var(--color-text)' }}>{u.display_name}</span>
                  <span className="badge badge-neutral">{u.global_role === 'admin' ? 'Admin' : u.global_role === 'gerente' ? 'Gerente' : 'Usuário'}</span>
                  <span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>{u.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="text-small text-muted mt-0.5">{u.email}</div>
                {u.squads.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {u.squads.map((sq) => <span key={sq.squad_id} className="badge badge-neutral">{sq.squad_name}</span>)}
                  </div>
                )}
              </div>
              {/* Ações */}
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEditUser(u)} className="btn btn-ghost">Editar</button>
                {u.id !== currentUserId && (
                  <>
                    <button onClick={() => setResetPasswordTarget(u)} className="btn btn-ghost" title="Resetar senha para Mudar@123">🔑 Resetar</button>
                    <button onClick={() => handleToggleActive(u)} className={u.active ? 'btn btn-destructive' : 'btn btn-ghost'} style={!u.active ? { color: '#3B6D11' } : undefined}>
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
