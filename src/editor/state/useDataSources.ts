import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'

export function useDataSources() {
  const store = useEditorInstance().dataSources
  const subscribe = useCallback((cb: () => void) => store.subscribe(cb), [store])
  const stateOf = useCallback(() => store.version, [store])
  useSyncExternalStore(subscribe, stateOf)
  return store
}
