import { useSyncExternalStore } from 'react'
import { useEditorInstance } from './EditorContext'
import type { MessageList } from './messages'

export function useMessages(): MessageList {
  const messages = useEditorInstance().messages
  useSyncExternalStore((cb) => messages.subscribe(cb), () => messages.version)
  return messages
}
