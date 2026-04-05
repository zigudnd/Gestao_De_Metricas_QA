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

    setLoading(true)
    try {
      // Atualiza a senha
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
          // Senha já foi alterada — navega mesmo assim para evitar redirect loop.
          // O usuário pode precisar trocar novamente se o flag persistir.
          console.warn('[Auth] Failed to clear must_change_password flag after 3 attempts:', metaErr)
        }
      }

      navigate('/sprints', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="card w-full max-w-[380px]" style={{ padding: '32px 28px' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="flex shrink-0 items-center justify-center rounded-[9px] bg-[var(--color-blue-text)] text-white text-sm font-bold tracking-tight" style={{ width: 34, height: 34 }}>
            TS
          </div>
          <span className="heading-md" style={{ fontWeight: 600 }}>ToStatos QA</span>
        </div>

        <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">
          Alterar senha
        </h1>
        <p className="text-body mb-6">
          {user?.email ? `Olá! Crie uma nova senha para ${user.email}.` : 'Crie uma nova senha para continuar.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="section-label" style={{ marginBottom: 0 }}>NOVA SENHA</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="chpwd-toggle flex items-center gap-1 border-none bg-transparent text-[11px] font-medium text-[var(--color-text-3)] cursor-pointer transition-colors"
                style={{ fontFamily: 'var(--font-family-sans)' }}
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
              className="input-field"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="section-label" style={{ marginBottom: 0 }}>CONFIRMAR SENHA</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              required
              minLength={8}
              className="input-field"
            />
          </label>

          {error && (
            <p className="msg-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg mt-1 w-full justify-center font-semibold"
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
