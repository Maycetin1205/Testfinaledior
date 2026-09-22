let open: string | null = null
const listeners = new Set<() => void>()

function report(next: string | null): void {
  open = next
  for (const fn of [...listeners]) fn()
}

export function openCalculationsWindow(blockId: string): void {
  report(blockId)
}

export function closeCalculationsWindow(): void {
  if (open !== null) report(null)
}

export function calculationsWindowOpenFor(): string | null {
  return open
}

export function onCalculationsSwitch(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
