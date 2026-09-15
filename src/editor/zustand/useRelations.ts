import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'

export function useRelations() {
  const store = useEditorInstance().relationen
  const abonniere = useCallback((cb: () => void) => store.subscribe(cb), [store])
  const standVon = useCallback(() => store.version, [store])
  useSyncExternalStore(abonniere, standVon)
  return store
}
