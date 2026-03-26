import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export function ProfilePage() {
  const { profile, updateDisplayName } = useAuthStore()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const initial = (profile?.display_name ?? profile?.email ?? '?')[0].toUpperCase()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === profile?.display_name) return
    setSaving(true)
    setError('')
    try {
      await updateDisplayName(trimmed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 24px' }}>
        Perfil
      </h1>

      {/* Avatar grande */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#E6F1FB', color: '#185FA5',
          border: '2px solid #B5D4F4',
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
        </div>
      </div>

      {/* Formulário */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '22px 20px',
      }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <p style={{ margin: 0, fontSize: 13, color: '#E24B4A', background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="submit"
              disabled={saving || !name.trim() || name.trim() === profile?.display_name}
              style={{
                padding: '9px 20px',
                background: '#185FA5',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: (saving || !name.trim() || name.trim() === profile?.display_name) ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#639922', fontWeight: 500 }}>
                Salvo!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
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
}
