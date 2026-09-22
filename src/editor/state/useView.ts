import { useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { EditorStore } from './EditorStore'

// Subscribes to what the editor shows, not to the mask itself.
export function useView(): EditorStore {
  const editor = useEditorInstance()
  useSyncExternalStore((cb) => editor.view.subscribe(cb), () => editor.viewVersion)
  return editor
}
