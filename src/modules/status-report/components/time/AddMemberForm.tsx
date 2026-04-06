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
    <form onSubmit={handleSubmit} style={{
      padding: '16px 18px',
      background: 'var(--color-bg)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          Convidar membro temporário
        </span>
        <button type="button" onClick={onCancel} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-3)', fontSize: 14, padding: '2px 4px',
        }}>×</button>
      </div>

      {/* Busca de usuario */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelSm}>Buscar usuário</label>
        {usersLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span style={{ color: 'var(--color-text-2)', fontSize: 13 }}>Carregando...</span>
          </div>
        ) : (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); setShowDropdown(true) }}
            onFocus={() => { if (!selectedUser) setShowDropdown(true) }}
            placeholder="Digite o nome ou email para buscar..."
            style={{
              ...inputSm,
              paddingRight: selectedUser ? 32 : 12,
              ...(selectedUser ? { borderColor: 'var(--color-blue)', background: 'var(--color-blue-light)' } : {}),
            }}
          />
          {selectedUser && (
            <button type="button" onClick={clearSelection} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)',
              fontSize: 14, padding: '2px 4px', lineHeight: 1,
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
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-3)' }}>
                  Nenhum usuário encontrado
                </div>
              )}
              {filtered.slice(0, 10).map((u) => (
                <div
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className="time-addmember-item"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '0.5px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--color-blue-light)', color: 'var(--color-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>
                    {u.display_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{u.display_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{u.email}</div>
                  </div>
                </div>
              ))}
              {filtered.length > 10 && (
                <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center' }}>
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelSm}>Papel</label>
            <select value={papel} onChange={(e) => setPapel(e.target.value)} style={inputSm}>
              {PAPEIS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Ações */}
      {selectedUser && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{
            padding: '7px 16px', borderRadius: 6,
            border: '1px solid var(--color-border-md)',
            background: 'transparent', color: 'var(--color-text-2)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          }}>
            Cancelar
          </button>
          <button type="submit" style={{
            padding: '7px 18px', borderRadius: 6, border: 'none',
            background: 'var(--color-blue)', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
          }}>
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

const labelSm: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--color-text-2)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

const inputSm: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', fontSize: 13,
  border: '0.5px solid var(--color-border)', borderRadius: 7,
  background: 'var(--color-surface)', color: 'var(--color-text)',
  outline: 'none', fontFamily: 'var(--font-family-sans)',
}
