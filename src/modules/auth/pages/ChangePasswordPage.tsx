import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '../store/authStore'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      // Atualiza a senha
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) throw pwErr

      // Remove a flag must_change_password
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { must_change_password: false },
      })
      if (metaErr) throw metaErr

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
        border: '0.5px solid var(--color-border)',
        borderRadius: 12,
        padding: '32px 28px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 34, height: 34, background: '#0c447c', borderRadius: 9,
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
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em' }}>NOVA SENHA</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoFocus
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', letterSpacing: '0.04em' }}>CONFIRMAR SENHA</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#E24B4A', background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: '10px 0',
              background: loading ? '#5a8fc5' : '#185FA5',
              color: '#fff', border: 'none', borderRadius: 7,
              fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '9px 11px',
  background: 'var(--color-bg)',
  border: '0.5px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--color-text)',
  outline: 'none',
}
