import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// ─── AuthPage ──────────────────────────────────────────────────────────────────
// Tela única de Login / Cadastro. Alterna entre os dois modos via toggle.

// ─── SSO Config (via .env) ─────────────────────────────────────────────────
const SSO_ENABLED = import.meta.env.VITE_SSO_ENABLED === 'true'
const SSO_LABEL = import.meta.env.VITE_SSO_LABEL || 'Entrar com SSO'
const SSO_PROVIDER = (import.meta.env.VITE_SSO_PROVIDER || 'azure') as 'azure' | 'google' | 'github' | 'gitlab' | 'keycloak'

const SSO_ICONS: Record<string, string> = {
  azure: '🔷', google: '🔴', github: '⬛', gitlab: '🟠', keycloak: '🔑',
}

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        const mustChange = data.user?.user_metadata?.must_change_password === true
        navigate(mustChange ? '/change-password' : '/sprints', { replace: true })
      } else {
        if (!displayName.trim()) {
          setError('Informe seu nome.')
          setLoading(false)
          return
        }
        if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); setLoading(false); return }
        if (!/[A-Z]/.test(password)) { setError('A senha deve conter pelo menos uma letra maiúscula.'); setLoading(false); return }
        if (!/[0-9]/.test(password)) { setError('A senha deve conter pelo menos um número.'); setLoading(false); return }
        if (!/[^a-zA-Z0-9]/.test(password)) { setError('A senha deve conter pelo menos um caractere especial.'); setLoading(false); return }
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (err) throw err
        setInfo('Conta criada! Verifique seu e-mail para confirmar e então faça login.')
        setMode('login')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? translateError(err.message) : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSSOLogin() {
    setError('')
    setSsoLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: SSO_PROVIDER,
        options: {
          scopes: 'email profile',
          redirectTo: window.location.origin + '/#/',
        },
      })
      if (err) throw err
      // Redirect happens automatically — browser navigates to provider
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com provedor SSO.')
      setSsoLoading(false)
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
          <span className="heading-md" style={{ fontWeight: 600 }}>
            ToStatos QA
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="text-body mb-6">
          {mode === 'login'
            ? 'Acesse seu workspace de QA.'
            : 'Crie sua conta para colaborar com squads.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === 'register' && (
            <Field label="Seu nome">
              <input
                data-testid="auth-input-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Ana Lima"
                required
                autoFocus
                className="input-field"
              />
            </Field>
          )}

          <Field label="E-mail">
            <input
              data-testid="auth-input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              required
              autoFocus={mode === 'login'}
              className="input-field"
            />
          </Field>

          <Field label="Senha">
            <div className="relative">
              <input
                data-testid="auth-input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : ''}
                required
                minLength={8}
                className="input-field pr-[38px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="auth-pwd-toggle absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center border-none bg-transparent p-0.5 leading-none text-[var(--color-text-3)] cursor-pointer transition-colors"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l14 14" />
                    <path d="M10 5c-4 0-7 3-8 5 .5 1 1.5 2.3 3 3.5" />
                    <path d="M10 15c4 0 7-3 8-5-.5-1-1.5-2.3-3-3.5" />
                    <circle cx="10" cy="10" r="2.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
                    <circle cx="10" cy="10" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </Field>

          {error && (
            <p className="msg-error">{error}</p>
          )}
          {info && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-blue)', background: 'var(--color-blue-light)', border: '1px solid var(--color-blue)', borderRadius: 6, padding: '8px 12px' }}>
              {info}
            </p>
          )}

          <button
            data-testid={mode === 'login' ? 'auth-btn-login' : 'auth-btn-signup'}
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg mt-1 w-full justify-center font-semibold"
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {/* SSO Login — condicional via VITE_SSO_ENABLED */}
        {SSO_ENABLED && mode === 'login' && (
          <>
            <div className="flex items-center gap-3 my-4.5">
              <div className="flex-1 h-px bg-[var(--color-border-md)]" />
              <span className="text-small text-muted font-medium">ou</span>
              <div className="flex-1 h-px bg-[var(--color-border-md)]" />
            </div>

            <button
              onClick={handleSSOLogin}
              disabled={ssoLoading}
              className="btn btn-outline btn-lg auth-sso-btn w-full justify-center font-semibold"
            >
              <span className="text-base">{SSO_ICONS[SSO_PROVIDER] || '🔑'}</span>
              {ssoLoading ? 'Redirecionando...' : SSO_LABEL}
            </button>
          </>
        )}

        {/* Toggle mode */}
        <p className="text-body mt-5 text-center">
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            data-testid="auth-link-toggle"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setPassword(''); setError(''); setInfo('') }}
            className="border-none bg-transparent p-0 text-[13px] font-semibold text-[var(--color-blue)] cursor-pointer transition-colors"
          >
            {mode === 'login' ? 'Criar conta' : 'Fazer login'}
          </button>
        </p>
        <style>{`
          .auth-pwd-toggle:hover { color: var(--color-text) !important; }
          .auth-sso-btn:hover:not(:disabled) { background: var(--color-blue-light) !important; border-color: var(--color-blue) !important; }
        `}</style>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="section-label" style={{ marginBottom: 0 }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 8 caracteres.'
  if (msg.includes('Unable to validate email')) return 'E-mail inválido.'
  return msg
}
