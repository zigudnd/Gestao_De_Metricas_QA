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
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/sprints', { replace: true })
      } else {
        if (!displayName.trim()) {
          setError('Informe seu nome.')
          setLoading(false)
          return
        }
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
            width: 34,
            height: 34,
            background: 'var(--color-blue-text)',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.5px',
            flexShrink: 0,
          }}>
            TS
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text)' }}>
            ToStatos QA
          </span>
        </div>

        {/* Title */}
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }}>
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-2)' }}>
          {mode === 'login'
            ? 'Acesse seu workspace de QA.'
            : 'Crie sua conta para colaborar com squads.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                style={inputStyle}
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
              style={inputStyle}
            />
          </Field>

          <Field label="Senha">
            <div style={{ position: 'relative' }}>
              <input
                data-testid="auth-input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : ''}
                required
                minLength={6}
                style={{ ...inputStyle, paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-3)', padding: '2px',
                  lineHeight: 1, transition: 'color 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-3)' }}
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
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-red-mid)', background: 'var(--color-red-light)', border: '1px solid var(--color-red)', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
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
            style={{
              marginTop: 4,
              padding: '10px 0',
              background: loading ? 'var(--color-blue)' : 'var(--color-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {/* SSO Login — condicional via VITE_SSO_ENABLED */}
        {SSO_ENABLED && mode === 'login' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '18px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-md)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-md)' }} />
            </div>

            <button
              onClick={handleSSOLogin}
              disabled={ssoLoading}
              style={{
                width: '100%',
                padding: '10px 0',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-md)',
                borderRadius: 7,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text)',
                cursor: ssoLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s, border-color 0.15s',
                fontFamily: 'var(--font-family-sans)',
              }}
              onMouseEnter={(e) => {
                if (!ssoLoading) {
                  e.currentTarget.style.background = 'var(--color-blue-light)'
                  e.currentTarget.style.borderColor = 'var(--color-blue)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-surface)'
                e.currentTarget.style.borderColor = 'var(--color-border-md)'
              }}
            >
              <span style={{ fontSize: 16 }}>{SSO_ICONS[SSO_PROVIDER] || '🔑'}</span>
              {ssoLoading ? 'Redirecionando...' : SSO_LABEL}
            </button>
          </>
        )}

        {/* Toggle mode */}
        <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-2)' }}>
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            data-testid="auth-link-toggle"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-blue)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              padding: 0,
            }}
          >
            {mode === 'login' ? 'Criar conta' : 'Fazer login'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em' }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '9px 11px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 7,
  fontSize: 14,
  color: 'var(--color-text)',
  outline: 'none',
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('Unable to validate email')) return 'E-mail inválido.'
  return msg
}
