import { BLOCK_ID_ATTR } from '../../core/data/actions'

export interface OperatorState<T> {
  read: (el: HTMLElement, key?: string) => T | null

  remember: (el: HTMLElement, state: T | null) => void
}

function keyFor(prefix: string, el: HTMLElement, key?: string): string {
  const title = typeof document === 'undefined' ? '' : document.title
  const id = key ?? el.getAttribute(BLOCK_ID_ATTR)
  if (id !== null && id !== '') return `${prefix}${title}|${id}`
  const same = Array.from(el.ownerDocument?.querySelectorAll(el.tagName) ?? [])
  return `${prefix}${title}|#${Math.max(0, same.indexOf(el))}`
}

export function makeOperatorState<T>(
  prefix: string,
  parse: (raw: unknown) => T | null,
): OperatorState<T> {
  const inMemory = new Map<string, T | null>()

  const read = (el: HTMLElement, key?: string): T | null => {
    const storeKey = keyFor(prefix, el, key)
    if (inMemory.has(storeKey)) return inMemory.get(storeKey) ?? null
    try {
      const raw = localStorage.getItem(storeKey)
      return raw === null ? null : parse(JSON.parse(raw))
    } catch {
      return null
    }
  }

  const remember = (el: HTMLElement, state: T | null): void => {
    const key = keyFor(prefix, el)
    inMemory.set(key, state)
    try {
      if (state === null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // Browser storage can be blocked; not remembering is no reason to fail.
    }
  }

  return { read, remember }
}
