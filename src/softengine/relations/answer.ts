import type { RelationAnswer } from '../../core/data/relations'
import { fieldRead, isObject } from '../data'

// Reading what SoftEngine answers to a GET relation: the one value, the raw
// record of a position, or one field out of the answer.

const RECORD_KEY = ['RESULT', 'result'] as const

const RESULT_KEYS = [
  'RESULT', 'result', 'PINDEX', 'pindex', 'INDEX', 'index',
  '0_10', 'KEY', 'key', 'ID', 'id', 'VALUE', 'value',
] as const

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) as unknown } catch { return undefined }
}

function scalar(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim()
    return t === '' ? undefined : t
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function firstScalar(value: unknown, depth: number): string | undefined {
  if (depth > 12) return undefined
  const direct = scalar(value)
  if (direct !== undefined) return direct
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstScalar(entry, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isObject(value)) return undefined
  for (const key of RESULT_KEYS) {
    if (!(key in value)) continue
    const found = firstScalar(value[key], depth + 1)
    if (found !== undefined) return found
  }
  for (const entry of Object.values(value)) {
    const found = firstScalar(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export function resultFromAnswer(raw: unknown): string | undefined {
  const value = parsed(raw)
  if (!isObject(value)) return undefined
  for (const key of RESULT_KEYS) {
    if (!(key in value)) continue
    const found = firstScalar(value[key], 0)
    if (found !== undefined) return found
  }

  for (const key of RECORD_KEY) {
    if (typeof value[key] === 'string') return ''
  }
  for (const entry of Object.values(value)) {
    if (Array.isArray(entry)) {
      for (const item of entry) {
        const found = resultFromAnswer(item)
        if (found !== undefined) return found
      }
    } else if (isObject(entry)) {
      const found = resultFromAnswer(entry)
      if (found !== undefined) return found
    }
  }
  return undefined
}

// The raw record as it stands, blanks and all: a position of a document.
export function extractRecordAnswer(raw: unknown, depth = 0): string | undefined {
  if (depth > 12) return undefined
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractRecordAnswer(entry, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isObject(value)) return undefined
  for (const key of RECORD_KEY) {
    const found = value[key]
    if (typeof found === 'string') return found
    if (typeof found === 'number' || typeof found === 'boolean') return String(found)
  }
  for (const entry of Object.values(value)) {
    const found = extractRecordAnswer(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export function fieldFromAnswer(raw: unknown, code: string, depth = 0): string {
  if (code.trim() === '' || depth > 12) return ''
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = fieldFromAnswer(entry, code, depth + 1)
      if (found !== '') return found
    }
    return ''
  }
  if (!isObject(value)) return ''
  const direct = fieldRead(value, code)
  if (direct !== '') return direct
  for (const entry of Object.values(value)) {
    const found = fieldFromAnswer(entry, code, depth + 1)
    if (found !== '') return found
  }
  return ''
}

// SoftEngine also lays every answer into SEDATA under Message<n>; the newest
// one not seen before is the answer to the question in flight.
export function seMessageKeys(seData: unknown): string[] {
  if (!isObject(seData)) return []
  return Object.keys(seData).filter((key) => /^Message\d+$/.test(key))
}

interface NewMessage extends RelationAnswer {
  key: string
}

export function newSeMessageResult(
  seData: unknown,
  before: ReadonlySet<string>,
  recordAnswer = false,
): NewMessage | undefined {
  if (!isObject(seData)) return undefined
  const keys = seMessageKeys(seData)
    .filter((key) => !before.has(key))
    .sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)))
  for (const key of keys) {
    const found = recordAnswer ? extractRecordAnswer(seData[key]) : resultFromAnswer(seData[key])
    if (found !== undefined) return { value: found, raw: seData[key], key: key }
  }
  return undefined
}
