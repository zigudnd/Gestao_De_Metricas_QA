import type React from 'react'

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1px solid var(--color-border-md)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)', outline: 'none',
}

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '8px 28px 8px 10px', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
}

export const labelSm: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-2)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

export const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', background: 'var(--color-blue)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
}

export const btnOutline: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent', color: 'var(--color-text-2)',
  border: '1px solid var(--color-border-md)', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
}

export const btnGhost: React.CSSProperties = {
  padding: '6px 10px', background: 'transparent', color: 'var(--color-text-2)',
  border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

export const btnDanger: React.CSSProperties = {
  padding: '7px 16px', background: 'var(--color-red)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
}

export const avatarBase: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  background: 'var(--color-blue-light)', color: 'var(--color-blue)',
  border: '0.5px solid var(--color-border)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, fontWeight: 500, flexShrink: 0,
}
