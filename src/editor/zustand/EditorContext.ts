// Der React-Kontext, ueber den die Oberflaeche an den Editor kommt.
import { createContext, useContext } from 'react'
import type { Editor } from './Editor'

export const EditorContext = createContext<Editor | null>(null)

export function useEditorInstance(): Editor {
  const instance = useContext(EditorContext)
  if (!instance) {
    throw new Error('EditorProvider fehlt — die App muss in <EditorProvider> eingespannt sein (src/app/providers.tsx).')
  }
  return instance
}
