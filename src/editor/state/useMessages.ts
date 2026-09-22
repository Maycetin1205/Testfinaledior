import { useSyncExternalStore } from 'react'
import { messages } from './messages'

const subscribe = (cb: () => void) => messages.subscribe(cb)
const stateOf = () => messages.version

export function useMessages() {
  useSyncExternalStore(subscribe, stateOf)
  return messages
}
