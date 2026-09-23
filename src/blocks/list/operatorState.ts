import { BLOCK_ID_ATTR } from '../../core/data/actions'
import { isPropertyEntry } from '../../core/block/property'
import { FIELD_KEY_PREFIX } from './columns'

export const LOOKUP_KEY_PART = '/lookup/'

const FORMER_LOOKUP_KEY_PART = '/nachschlagen/'

const FORMER_FIELD_KEY_PREFIX = 'feld:'

export interface OperatorState<T> {
  read: (el: HTMLElement, key?: string) => T | null

  remember: (el: HTMLElement, state: T | null) => void
}

function idFor(el: HTMLElement, key?: string): string {
  const id = key ?? el.getAttribute(BLOCK_ID_ATTR)
  if (id !== null && id !== '') return id
  const same = Array.from(el.ownerDocument?.querySelectorAll(el.tagName) ?? [])
  return `#${Math.max(0, same.indexOf(el))}`
}

function keyFor(prefix: string, id: string): string {
  const title = typeof document === 'undefined' ? '' : document.title
  return `${prefix}${title}|${id}`
}

function withCurrentNames(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.startsWith(FORMER_FIELD_KEY_PREFIX)
      ? FIELD_KEY_PREFIX + value.slice(FORMER_FIELD_KEY_PREFIX.length)
      : value
  }
  if (Array.isArray(value)) return value.map(withCurrentNames)
  if (!isPropertyEntry(value)) return value
  return Object.fromEntries(Object.entries(value)
    .map(([key, entry]) => [key === 'on' ? 'ascending' : key, withCurrentNames(entry)]))
}

export function makeOperatorState<T>(
  prefix: string,
  formerPrefix: string,
  parse: (raw: unknown) => T | null,
): OperatorState<T> {
  const inMemory = new Map<string, T | null>()

  const moved = (storeKey: string, id: string): T | null => {
    const formerKey = keyFor(formerPrefix, id.replace(LOOKUP_KEY_PART, FORMER_LOOKUP_KEY_PART))
    const raw = localStorage.getItem(formerKey)
    if (raw === null) return null
    const state = parse(withCurrentNames(JSON.parse(raw)))
    if (state !== null) localStorage.setItem(storeKey, JSON.stringify(state))
    localStorage.removeItem(formerKey)
    return state
  }

  const read = (el: HTMLElement, key?: string): T | null => {
    const id = idFor(el, key)
    const storeKey = keyFor(prefix, id)
    if (inMemory.has(storeKey)) return inMemory.get(storeKey) ?? null
    try {
      const raw = localStorage.getItem(storeKey)
      return raw === null ? moved(storeKey, id) : parse(JSON.parse(raw))
    } catch {
      return null
    }
  }

  const remember = (el: HTMLElement, state: T | null): void => {
    const key = keyFor(prefix, idFor(el))
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
