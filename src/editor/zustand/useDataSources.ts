import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'

export function useDataSources() {
  const store = useEditorInstance().datenquellen
  const abonniere = useCallback((cb: () => void) => store.subscribe(cb), [store])
  const standVon = useCallback(() => store.version, [store])
  useSyncExternalStore(abonniere, standVon)
  return store
}
