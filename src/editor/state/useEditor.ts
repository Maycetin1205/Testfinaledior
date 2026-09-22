import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'

export function useEditor() {
  const editor = useEditorInstance()

  const subscribe = useCallback(
    (cb: () => void) => editor.subscribe(cb),
    [editor],
  )
  useSyncExternalStore(subscribe, () => editor.version)
  return editor
}
