import { useCallback, useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { MaskFolder } from './maskFolder'

export function useMaskFolder(): MaskFolder {
  const folder = useEditorInstance().maskFolder
  const subscribe = useCallback((cb: () => void) => folder.subscribe(cb), [folder])
  const stateOf = useCallback(() => folder.version, [folder])
  useSyncExternalStore(subscribe, stateOf)
  return folder
}
