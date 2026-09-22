import { createContext, useContext } from 'react'
import type { EditorStore } from './EditorStore'

export const EditorContext = createContext<EditorStore | null>(null)

export function useEditorInstance(): EditorStore {
  const instance = useContext(EditorContext)
  if (!instance) {
    throw new Error('EditorProvider fehlt — die App muss in <EditorProvider> eingespannt sein.')
  }
  return instance
}
