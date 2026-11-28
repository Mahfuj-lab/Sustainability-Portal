import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            alignItems: 'center',
            background: '#f8fafc',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, sans-serif',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1>Something went wrong</h1>
          <p>The application encountered an unexpected error.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ cursor: 'pointer', padding: '0.5rem 1rem' }}
            type="button"
          >
            Try again
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
