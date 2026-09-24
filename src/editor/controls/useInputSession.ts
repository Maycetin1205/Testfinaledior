import { useCallback, useEffect, useMemo, useRef } from 'react'
import { gestureBracket, type GestureBracket } from '../state/history'

export interface EditSession {
  begin: () => void

  finish: () => void
}

export function useInputSession(
  onBeginEditing?: () => void,
  onEndEditing?: () => void,
): EditSession {
  const bracket = useRef<GestureBracket | null>(null)

  const callbacks = useRef({ onBeginEditing, onEndEditing })
  useEffect(() => {
    callbacks.current = { onBeginEditing, onEndEditing }
  })

  const finish = useCallback(() => {
    bracket.current?.close()
    bracket.current = null
  }, [])

  const begin = useCallback(() => {
    if (bracket.current) return
    const fresh = gestureBracket(
      () => callbacks.current.onBeginEditing?.(),
      () => callbacks.current.onEndEditing?.(),
    )
    bracket.current = fresh
    fresh.open()
  }, [])

  useEffect(() => finish, [finish])

  return useMemo(() => ({ begin, finish }), [begin, finish])
}
