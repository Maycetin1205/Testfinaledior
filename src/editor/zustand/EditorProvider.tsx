// Gibt den Editor-Zustand an die Oberflaeche weiter.
import type { ReactNode } from 'react'
import type { Editor } from './Editor'
import { EditorContext } from './EditorContext'

interface EditorProviderProps {
  editor: Editor
  children: ReactNode
}

export function EditorProvider({ editor, children }: EditorProviderProps) {
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}
