// Der Zugang der Oberflaeche zum Editor-Zustand.
import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'

export function useEditor() {
  const editor = useEditorInstance()

  const abonniere = useCallback(
    (cb: () => void) => editor.subscribe(cb),
    [editor],
  )
  useSyncExternalStore(abonniere, () => editor.version)
  return editor
}
