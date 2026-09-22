export function tagKey(value: unknown): string {
  const s = String(value ?? '').trim()
  if (s === '') return ''
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s)
  if (german) {
    return `${german[3]}-${german[2].padStart(2, '0')}-${german[1].padStart(2, '0')}`
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : ''
}

let tag = ''
const listeners = new Set<() => void>()

export function chosenDay(): string {
  return tag
}

export function setChosenDay(value: unknown): void {
  const next = tagKey(value)
  if (next === tag) return
  tag = next
  listeners.forEach((cb) => cb())
}

export function onChosenDay(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
