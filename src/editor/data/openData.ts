const EVENT = 'ff-data-open'

export function openData(): void {
  document.dispatchEvent(new CustomEvent(EVENT))
}

export function onDataRequest(fn: () => void): () => void {
  document.addEventListener(EVENT, fn)
  return () => document.removeEventListener(EVENT, fn)
}
