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
      <div className="flex h-screen w-screen items-center justify-center bg-grund p-6">
        <div className="flex max-w-md flex-col gap-3 rounded border border-linie bg-panel p-5">
          <h1 className="text-ui font-semibold text-tinte">
            Der Editor ist auf einen Fehler gelaufen.
          </h1>
          <p className="text-ui leading-relaxed text-matt">
            Die zuletzt gespeicherte Maske ist nicht betroffen — sie liegt im
            Browser-Speicher und wird beim Neuladen wieder geöffnet.
          </p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-control p-2 text-dicht text-tinte">
            {error.message}
          </pre>
          <Button kind="primary" className="self-start" onClick={() => { location.reload() }}>
            Neu laden
          </Button>
        </div>
      </div>
    )
  }
}
