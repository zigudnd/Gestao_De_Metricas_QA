import { useState } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '4px 10px', fontSize: 12, minHeight: 28 },
  md: { padding: '7px 16px', fontSize: 13, minHeight: 36 },
  lg: { padding: '10px 20px', fontSize: 14, minHeight: 44 },
}

const VARIANT_STYLES: Record<ButtonVariant, { base: React.CSSProperties; hover: React.CSSProperties }> = {
  primary: {
    base: { background: 'var(--color-blue)', color: '#fff', border: 'none', fontWeight: 600 },
    hover: { background: '#1a6bbf' },
  },
  secondary: {
    base: { background: 'var(--color-bg)', color: 'var(--color-text)', border: '0.5px solid var(--color-border)' },
    hover: { background: 'var(--color-border)' },
  },
  ghost: {
    base: { background: 'transparent', color: 'var(--color-text-2)', border: 'none' },
    hover: { background: 'var(--color-bg)' },
  },
  outline: {
    base: { background: 'transparent', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' },
    hover: { background: 'var(--color-bg)' },
  },
  danger: {
    base: { background: 'transparent', color: 'var(--color-red)', border: '1px solid var(--color-red-mid)' },
    hover: { background: 'var(--color-red-light)' },
  },
}

const BASE_STYLE: React.CSSProperties = {
  borderRadius: 8,
  fontWeight: 500,
  fontFamily: 'var(--font-family-sans)',
  cursor: 'pointer',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

export function Button({ variant = 'primary', size = 'md', children, style, disabled, ...props }: ButtonProps) {
  const [hovered, setHovered] = useState(false)
  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={(e) => { setHovered(true); props.onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setHovered(false); props.onMouseLeave?.(e) }}
      style={{
        ...BASE_STYLE,
        ...s,
        ...v.base,
        ...(hovered && !disabled ? v.hover : {}),
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  )
}
