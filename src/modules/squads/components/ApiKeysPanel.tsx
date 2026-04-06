import { useState, useEffect, useCallback } from 'react'
import { listApiKeys, createApiKey, revokeApiKey, type ApiKey } from '../services/apiKeysService'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'

// ─── Permission definitions ─────────────────────────────────────────────────

const AVAILABLE_PERMISSIONS: { key: string; label: string }[] = [
  { key: 'sprints:read', label: 'Ler sprints e métricas' },
  { key: 'bugs:write', label: 'Criar bugs via API' },
  { key: 'releases:read', label: 'Ler releases e métricas' },
  { key: 'releases:write', label: 'Atualizar status de releases' },
  { key: 'squads:read', label: 'Ler squads e membros' },
]

const EXPIRATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 365, label: '1 ano' },
  { value: null, label: 'Sem expiração' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Agora mesmo'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function permissionLabels(perms: Record<string, boolean>): string[] {
  return Object.entries(perms)
    .filter(([, v]) => v)
    .map(([k]) => k)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({})
  const [newExpiration, setNewExpiration] = useState<number | null>(30)
  const [creating, setCreating] = useState(false)

  // Token reveal modal
  const [revealToken, setRevealToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listApiKeys()
      setKeys(data)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao carregar API keys', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  // ── Create ───────────────────────────────────────────────────────────────

  function openCreateModal() {
    setNewName('')
    setNewPerms({})
    setNewExpiration(30)
    setShowCreateModal(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { rawToken } = await createApiKey({
        name: newName.trim(),
        permissions: newPerms,
        expires_in_days: newExpiration,
      })
      setShowCreateModal(false)
      setRevealToken(rawToken)
      setCopied(false)
      showToast('API key criada com sucesso', 'success')
      loadKeys()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao criar API key', 'error')
    } finally {
      setCreating(false)
    }
  }

  // ── Revoke ──────────────────────────────────────────────────────────────

  async function handleRevoke() {
    if (!revokeTarget) return
    try {
      await revokeApiKey(revokeTarget.id)
      showToast('API key revogada', 'success')
      setRevokeTarget(null)
      loadKeys()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao revogar', 'error')
    }
  }

  // ── Copy token ──────────────────────────────────────────────────────────

  async function copyToken() {
    if (!revealToken) return
    try {
      await navigator.clipboard.writeText(revealToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast('Falha ao copiar para a área de transferência', 'error')
    }
  }

  // ── Filter ──────────────────────────────────────────────────────────────

  const filteredKeys = keys.filter((k) =>
    k.name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[860px]">
      {/* Header */}
      <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-2)' }}>
        Gerencie chaves de API para integrações externas (CI/CD, automações, webhooks).
      </p>

      {/* Search + Create button */}
      <div className="flex items-center gap-2.5 mb-3.5">
        {keys.length > 0 && (
          <div className="relative flex-1 max-w-[320px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-3)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
            </span>
            <input
              type="text"
              placeholder="Buscar API key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[13px] rounded-lg border-0 outline-none"
              style={{ ...inputStyle, paddingLeft: 32 }}
              aria-label="Buscar API keys por nome"
            />
          </div>
        )}
        <button
          onClick={openCreateModal}
          style={btnPrimary}
          aria-label="Criar nova API key"
        >
          + Nova API Key
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-[13px] py-8 text-center" style={{ color: 'var(--color-text-3)' }}>
          Carregando...
        </p>
      )}

      {/* Empty state */}
      {!loading && keys.length === 0 && (
        <div
          className="text-center py-12 rounded-xl"
          style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border-md)' }}
        >
          <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--color-text-2)' }}>
            Nenhuma API key criada
          </p>
          <p className="text-[12px]" style={{ color: 'var(--color-text-3)' }}>
            Crie uma chave para integrar sistemas externos.
          </p>
        </div>
      )}

      {/* No results */}
      {!loading && keys.length > 0 && filteredKeys.length === 0 && (
        <p className="text-[13px] py-6 text-center" style={{ color: 'var(--color-text-3)' }}>
          Nenhuma API key encontrada para "{search}"
        </p>
      )}

      {/* Key cards */}
      {!loading && filteredKeys.map((k) => (
        <div
          key={k.id}
          className="mb-2.5 rounded-xl p-4"
          style={{
            background: 'var(--color-surface)',
            border: '0.5px solid var(--color-border)',
            opacity: k.is_active ? 1 : 0.6,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Left content */}
            <div className="flex-1 min-w-0">
              {/* Name + prefix */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[14px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  {k.name}
                </span>
                <span
                  className="text-[11px] font-mono px-2 py-0.5 rounded-md"
                  style={{
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-2)',
                    border: '0.5px solid var(--color-border)',
                  }}
                >
                  {k.key_prefix}...
                </span>
                {/* Status badge */}
                {k.is_active ? (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-green-light)', color: 'var(--color-green-text)' }}
                  >
                    Ativo
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}
                  >
                    Revogado
                  </span>
                )}
              </div>

              {/* Permissions */}
              {permissionLabels(k.permissions).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {permissionLabels(k.permissions).map((p) => (
                    <span
                      key={p}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--color-blue-light)', color: 'var(--color-blue-text)' }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: 'var(--color-text-3)' }}>
                <span>Criado em {formatDate(k.created_at)}</span>
                <span>Ultimo uso: {relativeTime(k.last_used_at)}</span>
                {k.expires_at && (
                  <span>Expira em {formatDate(k.expires_at)}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {k.is_active && (
              <button
                onClick={() => setRevokeTarget(k)}
                className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg cursor-pointer border-none"
                style={{
                  background: 'var(--color-red-light)',
                  color: 'var(--color-red)',
                }}
                aria-label={`Revogar API key ${k.name}`}
              >
                Revogar
              </button>
            )}
          </div>
        </div>
      ))}

      {/* ── Revoke confirmation modal ─────────────────────────────────────────── */}
      {revokeTarget && (
        <ConfirmModal
          title="Revogar API Key"
          description={`Tem certeza que deseja revogar a chave "${revokeTarget.name}"? Integrações que usam essa chave deixarão de funcionar.`}
          confirmLabel="Revogar"
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          style={backdropStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Criar nova API key"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalStyle, width: 440 }}
          >
            <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--color-text)' }}>
              Nova API Key
            </h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                  Nome
                </label>
                <input
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: CI/CD Pipeline, Grafana..."
                  style={inputStyle}
                  aria-label="Nome da API key"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                  Permissoes
                </label>
                <div className="flex flex-col gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 cursor-pointer text-[13px]"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <input
                        type="checkbox"
                        checked={!!newPerms[perm.key]}
                        onChange={(e) =>
                          setNewPerms((prev) => ({ ...prev, [perm.key]: e.target.checked }))
                        }
                        className="accent-[var(--color-blue)]"
                        aria-label={`Permissão: ${perm.label}`}
                      />
                      <span className="font-mono text-[12px] px-1 rounded" style={{ background: 'var(--color-surface-2)' }}>
                        {perm.key}
                      </span>
                      <span className="text-[12px]" style={{ color: 'var(--color-text-2)' }}>
                        — {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                  Expiracao
                </label>
                <select
                  value={newExpiration === null ? '' : String(newExpiration)}
                  onChange={(e) => setNewExpiration(e.target.value === '' ? null : Number(e.target.value))}
                  style={selectStyle}
                  aria-label="Prazo de expiração"
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value === null ? '' : String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={btnGhost}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || creating}
                  style={{
                    ...btnPrimary,
                    opacity: !newName.trim() || creating ? 0.5 : 1,
                    cursor: !newName.trim() || creating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Token reveal modal ────────────────────────────────────────────────── */}
      {revealToken && (
        <div
          onClick={() => {}} // prevent closing by clicking backdrop
          style={backdropStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Token gerado"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalStyle, width: 520 }}
          >
            <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--color-text)' }}>
              API Key criada com sucesso
            </h3>

            <div
              className="rounded-lg p-3 mb-3"
              style={{ background: 'var(--color-amber-light)', border: '1px solid var(--color-amber-mid)' }}
            >
              <p className="text-[12px] font-medium" style={{ color: 'var(--color-amber)' }}>
                Este token nao sera exibido novamente. Copie agora.
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                readOnly
                value={revealToken}
                className="flex-1 font-mono text-[12px] rounded-lg border-0 outline-none"
                style={{
                  ...inputStyle,
                  background: 'var(--color-surface-2)',
                  fontFamily: 'var(--font-family-mono)',
                }}
                aria-label="Token da API key"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyToken}
                style={{
                  ...btnPrimary,
                  background: copied ? 'var(--color-green)' : 'var(--color-blue)',
                  minWidth: 80,
                }}
                aria-label="Copiar token"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setRevealToken(null)}
                style={btnPrimary}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles (matching SquadsPage pattern) ───────────────────────────────────

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', background: 'var(--color-blue)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  padding: '5px 10px', background: 'none', color: 'var(--color-text-2)',
  border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
  background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
  borderRadius: 8, fontSize: 13, color: 'var(--color-text)', outline: 'none',
}

const selectStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 28px 8px 12px',
  background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
  borderRadius: 8, fontSize: 13, color: 'var(--color-text)', outline: 'none',
  appearance: 'none', cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
}

const modalStyle: React.CSSProperties = {
  background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
  borderRadius: 12, padding: '24px 22px', width: 360, maxWidth: '90vw',
  boxShadow: 'var(--shadow-xl)',
}
