import { useEffect, useState, type ReactNode } from 'react'
import { EditorStore } from './state/EditorStore'
import { EditorProvider } from './state/EditorProvider'
import { ErrorBoundary } from './ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [editor] = useState(() => new EditorStore())

  // The folder of masks of the last time, and the file of the mask in it.
  useEffect(() => {
    void editor.reopenFolder()
  }, [editor])

  useEffect(() => {
    const rescue = (): void => {
      editor.saveNow()
    }
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') rescue()
    }
    window.addEventListener('pagehide', rescue)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', rescue)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [editor])

  return (
    <EditorProvider editor={editor}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </EditorProvider>
  )
}
