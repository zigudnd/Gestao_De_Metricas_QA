import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  moduleName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
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
        <div className="msg-error m-4 p-8 text-center rounded-[12px]">
          <div className="text-[14px] font-bold text-red mb-2">
            Algo deu errado{this.props.moduleName ? ` em ${this.props.moduleName}` : ''}
          </div>
          <div className="text-small mb-3">
            {this.state.error?.message || 'Erro inesperado'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null, retryCount: this.state.retryCount + 1 })}
            aria-label="Tentar novamente"
            className="btn btn-sm"
            style={{ background: 'var(--color-red)', color: '#fff' }}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return <div key={this.state.retryCount}>{this.props.children}</div>
  }
}
