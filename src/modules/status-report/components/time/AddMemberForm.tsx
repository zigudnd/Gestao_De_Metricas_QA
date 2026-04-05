import { useState, useEffect, useRef } from 'react'
import { listAllUsers } from '@/modules/squads/services/squadsService'
import type { Profile } from '@/modules/auth/store/authStore'
import type { MembroTime } from '../../types/squadConfig.types'

interface AddMemberFormProps {
  existingMemberIds: string[]   // userIds já no time (para excluir da busca)
  onAdd: (m: Omit<MembroTime, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

const PAPEIS = [
  'Dev Mobile iOS', 'Dev Mobile Android', 'Dev Backend', 'Dev BFF',
  'QA', 'Tech Lead', 'Scrum Master', 'Product Owner', 'Designer',
]

export function AddMemberForm({ existingMemberIds, onAdd, onCancel }: AddMemberFormProps) {
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [papel, setPapel] = useState('QA')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listAllUsers().then(setAllUsers).catch((e) => { if (import.meta.env.DEV) console.warn('[StatusReport] Failed to load users:', e) }).finally(() => setUsersLoading(false))
  }, [])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showDropdown])

  const existingSet = new Set(existingMemberIds)
  const filtered = allUsers
    .filter((u) => !existingSet.has(u.id))
    .filter((u) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (u.display_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })

  function selectUser(u: Profile) {
    setSelectedUser(u)
    setSearch(u.display_name)
    setShowDropdown(false)
  }

  function clearSelection() {
    setSelectedUser(null)
    setSearch('')
    setShowDropdown(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    onAdd({
      tipo: 'temporario',
      userId: selectedUser.id,
      nome: selectedUser.display_name,
      email: selectedUser.email,
      papel,
      ativo: true,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ background: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="heading-sm">
          Convidar membro temporário
        </span>
        <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ padding: '2px 4px' }}>×</button>
      </div>

      {/* Busca de usuario */}
      <div className="mb-3.5">
        <label className="section-label">Buscar usuário</label>
        {usersLoading ? (
          <div className="flex items-center justify-center" style={{ height: 120 }}>
            <span className="text-body">Carregando...</span>
          </div>
        ) : (
        <div ref={dropdownRef} className="relative">
          <input
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); setShowDropdown(true) }}
            onFocus={() => { if (!selectedUser) setShowDropdown(true) }}
            placeholder="Digite o nome ou email para buscar..."
            className="input-field"
            style={{
              paddingRight: selectedUser ? 32 : 12,
              ...(selectedUser ? { borderColor: 'var(--color-blue)', background: 'var(--color-blue-light)' } : {}),
            }}
          />
          {selectedUser && (
            <button type="button" onClick={clearSelection} className="btn btn-ghost" style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              padding: '2px 4px', lineHeight: 1,
            }}>×</button>
          )}
          {showDropdown && search.length > 0 && !selectedUser && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              marginTop: 4, border: '0.5px solid var(--color-border)',
              borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
              background: 'var(--color-surface)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}>
              {filtered.length === 0 && (
                <div className="text-small text-muted" style={{ padding: '12px 14px' }}>
                  Nenhum usuário encontrado
                </div>
              )}
              {filtered.slice(0, 10).map((u) => (
                <div
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className="time-addmember-item flex items-center gap-2.5"
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '0.5px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    transition: 'background 0.1s',
                  }}
                >
                  <div className="flex items-center justify-center" style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--color-blue-light)', color: 'var(--color-blue)',
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>
                    {u.display_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.display_name}</div>
                    <div className="text-small text-muted">{u.email}</div>
                  </div>
                </div>
              ))}
              {filtered.length > 10 && (
                <div className="text-small text-muted text-center" style={{ padding: '8px 14px' }}>
                  +{filtered.length - 10} resultados — refine a busca
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Papel (visível após selecionar usuario) */}
      {selectedUser && (
        <div className="flex gap-2.5 flex-wrap mb-3.5">
          <div className="flex-1" style={{ minWidth: 160 }}>
            <label className="section-label">Papel</label>
            <select value={papel} onChange={(e) => setPapel(e.target.value)} className="select-field">
              {PAPEIS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Ações */}
      {selectedUser && (
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn btn-outline btn-sm">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            Convidar
          </button>
        </div>
      )}
      <style>{`
        .time-addmember-item:hover { background: var(--color-surface-2) !important; }
      `}</style>
    </form>
  )
}
