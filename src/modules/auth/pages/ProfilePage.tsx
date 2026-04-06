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
    <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 24px' }}>
        Perfil
      </h1>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--color-blue-light)', color: 'var(--color-blue)',
          border: '2px solid var(--color-blue-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
            {profile?.display_name ?? '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 2 }}>
            {profile?.email ?? ''}
          </div>
          {profile?.global_role === 'admin' && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--color-blue)',
              background: 'var(--color-blue-light)', padding: '2px 8px',
              borderRadius: 4, marginTop: 4, display: 'inline-block',
            }}>
              ADMIN
            </span>
          )}
        </div>
      </div>

      {/* Dados pessoais */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Dados pessoais</div>
        <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelSm}>Nome de exibição</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false) }}
              placeholder="Seu nome"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelSm}>E-mail</label>
            <input
              value={profile?.email ?? ''}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-3)' }}>
              O e-mail não pode ser alterado.
            </p>
          </div>

          {error && (
            <p style={errorStyle}>{error}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="submit"
              disabled={saving || !name.trim() || name.trim() === profile?.display_name}
              style={{
                ...btnPrimary,
                opacity: (saving || !name.trim() || name.trim() === profile?.display_name) ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: 'var(--color-green)', fontWeight: 500 }}>
                Salvo!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Alterar senha */}
      <div style={{ ...sectionStyle, marginTop: 16 }}>
        <div style={sectionHeaderStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
          </svg>
          Alterar senha
        </div>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelSm}>Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError('') }}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelSm}>Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setPwError('') }}
              placeholder="Repita a nova senha"
              minLength={8}
              style={inputStyle}
            />
          </div>

          {pwError && (
            <p style={errorStyle}>{pwError}</p>
          )}

          <button
            type="submit"
            disabled={pwLoading || !password || !confirm}
            style={{
              ...btnPrimary,
              opacity: (pwLoading || !password || !confirm) ? 0.5 : 1,
            }}
          >
            {pwLoading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: '22px 20px',
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-text)',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
}

const labelSm: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-2)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 7,
  fontSize: 14,
  color: 'var(--color-text)',
  outline: 'none',
  fontFamily: 'var(--font-family-sans)',
}

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  transition: 'all 0.15s',
}

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'var(--color-red)',
  background: 'var(--color-red-light)',
  border: '1px solid var(--color-red-mid)',
  borderRadius: 6,
  padding: '8px 12px',
}
