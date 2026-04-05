import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/app/components/Toast'

export function ProfilePage() {
  const { profile, updateDisplayName } = useAuthStore()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Password
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile?.display_name])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const initial = (profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === profile?.display_name) return
    setSaving(true)
    setError('')
    const { error: err } = await updateDisplayName(trimmed)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')

    if (password.length < 8) { setPwError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(password)) { setPwError('A senha deve conter pelo menos uma letra maiúscula.'); return }
    if (!/[0-9]/.test(password)) { setPwError('A senha deve conter pelo menos um número.'); return }
    if (!/[^a-zA-Z0-9]/.test(password)) { setPwError('A senha deve conter pelo menos um caractere especial.'); return }
    if (password !== confirm) { setPwError('As senhas não coincidem.'); return }

    setPwLoading(true)
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) throw pwErr

      // Remove a flag must_change_password (com retry para evitar loop infinito)
      let metaUpdated = false
      for (let attempt = 0; attempt < 3 && !metaUpdated; attempt++) {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { must_change_password: false },
        })
        if (!metaErr) {
          metaUpdated = true
        } else if (attempt === 2) {
          console.warn('[Auth] Failed to clear must_change_password flag after 3 attempts:', metaErr)
        }
      }

      setPassword('')
      setConfirm('')
      showToast('Senha alterada com sucesso', 'success')
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[480px] pt-2">
      <h1 className="heading-lg mb-6">
        Perfil
      </h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-blue-light)] text-[var(--color-blue)] text-[26px] font-bold" style={{ width: 64, height: 64, border: '2px solid var(--color-blue-light)' }}>
          {initial}
        </div>
        <div>
          <div className="heading-md" style={{ fontWeight: 600 }}>
            {profile?.display_name ?? '—'}
          </div>
          <div className="text-body mt-0.5">
            {profile?.email ?? ''}
          </div>
          {profile?.global_role === 'admin' && (
            <span className="badge badge-blue mt-1 font-bold">
              ADMIN
            </span>
          )}
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="card">
        <div className="heading-sm mb-4 flex items-center">Dados pessoais</div>
        <form onSubmit={handleSaveName} className="flex flex-col gap-4">
          <div>
            <label className="section-label">Nome de exibição</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false) }}
              placeholder="Seu nome"
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="section-label">E-mail</label>
            <input
              value={profile?.email ?? ''}
              disabled
              className="input-field opacity-50 cursor-not-allowed"
            />
            <p className="text-small text-muted mt-1">
              O e-mail não pode ser alterado.
            </p>
          </div>

          {error && (
            <p className="msg-error">{error}</p>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              disabled={saving || !name.trim() || name.trim() === profile?.display_name}
              className="btn btn-primary btn-md font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {saved && (
              <span className="text-[13px] font-medium text-[var(--color-green)]">
                Salvo!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="card mt-4">
        <div className="heading-sm mb-4 flex items-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 align-middle">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
          </svg>
          Alterar senha
        </div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3.5">
          <div>
            <label className="section-label">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError('') }}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              className="input-field"
            />
          </div>

          <div>
            <label className="section-label">Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setPwError('') }}
              placeholder="Repita a nova senha"
              minLength={8}
              className="input-field"
            />
          </div>

          {pwError && (
            <p className="msg-error">{pwError}</p>
          )}

          <button
            type="submit"
            disabled={pwLoading || !password || !confirm}
            className="btn btn-primary btn-md font-semibold"
          >
            {pwLoading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
