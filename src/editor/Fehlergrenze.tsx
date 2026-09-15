// Faengt einen Absturz der Oberflaeche ab und zeigt ihn an.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Knopf } from '@/editor/werkbank/Knopf'

interface FehlergrenzeProps {
  children: ReactNode
}

interface FehlergrenzeState {
  fehler: Error | null
}

export class Fehlergrenze extends Component<FehlergrenzeProps, FehlergrenzeState> {
  override state: FehlergrenzeState = { fehler: null }

  static getDerivedStateFromError(fehler: unknown): FehlergrenzeState {
    return { fehler: fehler instanceof Error ? fehler : new Error(String(fehler)) }
  }

  override componentDidCatch(fehler: Error, info: ErrorInfo): void {
    console.error('Editor abgestuerzt:', fehler, info.componentStack)
  }

  override render(): ReactNode {
    const { fehler } = this.state
    if (!fehler) return this.props.children
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
            {fehler.message}
          </pre>
          <Knopf art="primaer" className="self-start" onClick={() => { location.reload() }}>
            Neu laden
          </Knopf>
        </div>
      </div>
    )
  }
}
