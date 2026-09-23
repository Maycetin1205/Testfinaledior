import { useEffect, useRef } from 'react'

// Open windows in opening order; Escape closes the last one and stops there.
// Listening from the start keeps it ahead of a mask dialog frame's listener.
const open: (() => void)[] = []

window.addEventListener('keydown', (e) => {
  const close = open.at(-1)
  if (e.key !== 'Escape' || close === undefined) return
  e.stopImmediatePropagation()
  close()
}, true)

export function useCloseOnEscape(onClose: () => void): void {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => {
    const close = (): void => latest.current()
    open.push(close)
    return () => {
      open.splice(open.indexOf(close), 1)
    }
  }, [])
}
