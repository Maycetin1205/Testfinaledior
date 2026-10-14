import { useEffect, useState, type ReactNode } from 'react'
import { maskState } from '../runtime/maskState'
import { previewHost } from '../runtime/previewHost'
import { EditorStore } from './state/EditorStore'
import { EditorProvider } from './state/EditorProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { editorSamples } from './probedaten/samples'

interface ProvidersProps {
  children: ReactNode
}

// The editor draws the blocks of the mask without SoftEngine behind them:
// before the first block stands on the canvas, their host becomes the
// editor's, which holds sample rows for the editor's sources.
function editorWithHost(): EditorStore {
  const editor = new EditorStore()
  maskState.host = previewHost(editorSamples(() => editor.dataSources.list))
  return editor
}

export function Providers({ children }: ProvidersProps) {
  const [editor] = useState(editorWithHost)

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
