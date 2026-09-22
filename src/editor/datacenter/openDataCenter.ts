const EREIGNIS = 'ff-datencenter-oeffnen'

export function openDataCenter(): void {
  document.dispatchEvent(new CustomEvent(EREIGNIS))
}

export function onDataCenterWish(fn: () => void): () => void {
  document.addEventListener(EREIGNIS, fn)
  return () => document.removeEventListener(EREIGNIS, fn)
}
