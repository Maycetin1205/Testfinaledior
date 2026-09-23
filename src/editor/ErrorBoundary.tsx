import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/editor/widgets/PushButton'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Editor abgestuerzt:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ground p-6">
        <div className="flex max-w-md flex-col gap-3 rounded border border-line bg-panel p-5">
          <Button kind="primary" className="self-start" onClick={() => { location.reload() }}>
            Neu laden
          </Button>
        </div>
      </div>
    )
  }
}
