import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// ─── AuthPage ──────────────────────────────────────────────────────────────────
// Tela única de Login / Cadastro. Alterna entre os dois modos via toggle.

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
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
            background: '#0c447c',
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : ''}
              required
              minLength={6}
              style={inputStyle}
            />
          </Field>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#E24B4A', background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{ margin: 0, fontSize: 13, color: '#185FA5', background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: 6, padding: '8px 12px' }}>
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '10px 0',
              background: loading ? '#5a8fc5' : '#185FA5',
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

        {/* Toggle mode */}
        <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-2)' }}>
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
            style={{
              background: 'none',
              border: 'none',
              color: '#185FA5',
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
