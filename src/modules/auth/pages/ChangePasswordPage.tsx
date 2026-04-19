import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '../store/authStore'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(password)) { setError('A senha deve conter pelo menos uma letra maiúscula.'); return }
    if (!/[0-9]/.test(password)) { setError('A senha deve conter pelo menos um número.'); return }
    if (!/[^a-zA-Z0-9]/.test(password)) { setError('A senha deve conter pelo menos um caractere especial.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password === 'Mudar@123!Ts') { setError('A nova senha não pode ser igual à senha temporária.'); return }

    setLoading(true)
    try {
      // Atualiza a senha e remove a flag must_change_password em uma única chamada
      const { error: pwErr } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      })
      if (pwErr) throw pwErr

      navigate('/sprints', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '32px 28px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 34, height: 34, background: 'var(--color-blue-text)', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.5px', flexShrink: 0,
          }}>TS</div>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text)' }}>ToStatos QA</span>
        </div>

        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }}>
          Alterar senha
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-2)' }}>
          {user?.email ? `Olá! Crie uma nova senha para ${user.email}.` : 'Crie uma nova senha para continuar.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em' }}>NOVA SENHA</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="chpwd-toggle"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-3)', fontSize: 11, fontWeight: 500,
                  fontFamily: 'var(--font-family-sans)',
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'color 0.15s',
                }}
              >
                {showPassword ? (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l14 14" />
                    <path d="M10 5c-4 0-7 3-8 5 .5 1 1.5 2.3 3 3.5" />
                    <path d="M10 15c4 0 7-3 8-5-.5-1-1.5-2.3-3-3.5" />
                    <circle cx="10" cy="10" r="2.5" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
                    <circle cx="10" cy="10" r="2.5" />
                  </svg>
                )}
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoFocus
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em' }}>CONFIRMAR SENHA</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              required
              minLength={8}
              style={inputStyle}
            />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-red-mid)', background: 'var(--color-red-light)', border: '1px solid var(--color-red-mid)', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: '10px 0',
              background: 'var(--color-blue)',
              color: '#fff', border: 'none', borderRadius: 7,
              fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
        <style>{`
          .chpwd-toggle:hover { color: var(--color-text) !important; }
        `}</style>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '9px 11px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--color-text)',
  outline: 'none',
}
