import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  moduleName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary${this.props.moduleName ? ` — ${this.props.moduleName}` : ''}]`, error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          padding: '32px 24px', textAlign: 'center',
          background: 'var(--color-red-light)', borderRadius: 12,
          border: '1px solid var(--color-red-mid)', margin: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-red)', marginBottom: 8 }}>
            Algo deu errado{this.props.moduleName ? ` em ${this.props.moduleName}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 12 }}>
            {this.state.error?.message || 'Erro inesperado'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            aria-label="Tentar novamente"
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              background: 'var(--color-red)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
