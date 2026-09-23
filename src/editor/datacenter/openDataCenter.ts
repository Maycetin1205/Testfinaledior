const EVENT = 'ff-datacenter-open'

export function openDataCenter(): void {
  document.dispatchEvent(new CustomEvent(EVENT))
}

export function onDataCenterRequest(fn: () => void): () => void {
  document.addEventListener(EVENT, fn)
  return () => document.removeEventListener(EVENT, fn)
}
