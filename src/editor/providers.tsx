// Die Kontexte, in denen der Editor laeuft.
import { useEffect, useState, type ReactNode } from 'react'
import { Editor } from './zustand/Editor'
import { EditorProvider } from './zustand/EditorProvider'
import { Fehlergrenze } from './Fehlergrenze'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [editor] = useState(() => new Editor())

  useEffect(() => {
    const rette = (): void => {
      editor.speichereJetzt()
    }
    const beiVerborgen = (): void => {
      if (document.visibilityState === 'hidden') rette()
    }
    window.addEventListener('pagehide', rette)
    document.addEventListener('visibilitychange', beiVerborgen)
    return () => {
      window.removeEventListener('pagehide', rette)
      document.removeEventListener('visibilitychange', beiVerborgen)
    }
  }, [editor])

  return (
    <EditorProvider editor={editor}>
      <Fehlergrenze>
        {children}
      </Fehlergrenze>
    </EditorProvider>
  )
}
