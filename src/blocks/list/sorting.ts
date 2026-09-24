import { isUnread } from '../../core/unread'
import { readDate } from '../../runtime/chosenDay'
import { makeOperatorState } from './operatorState'

const EMPTY_LAST = 1

const NUMBER = /^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$|^-?\d+(,\d+)?$|^-?\d+(\.\d+)?$/

export function asNumber(value: string): number | null {
  const t = value.trim()
  if (t === '' || !NUMBER.test(t)) return null

  const norm = t.includes(',')
    ? t.replace(/\./g, '').replace(',', '.')
    : /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

function asDate(value: string): number | null {
  return readDate(value)?.getTime() ?? null
}

type Kind = 'number' | 'date' | 'text'

function detectKind(values: readonly string[]): Kind {
  let filled = 0
  let numbers = 0
  let dates = 0
  for (const w of values) {
    if (w.trim() === '') continue
    filled++
    if (asNumber(w) !== null) numbers++
    if (asDate(w) !== null) dates++
  }
  if (filled === 0) return 'text'
  if (dates === filled) return 'date'
  if (numbers === filled) return 'number'
  return 'text'
}

const textCompare = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

export function sortIndices(
  rows: readonly (readonly string[])[],
  column: number,
  ascending: boolean,
): number[] {
  if (column < 0 || rows.length === 0) return rows.map((_, i) => i)

  const cell = (i: number): string => rows[i][column] ?? ''
  const kind = detectKind(rows.map((z) => z[column] ?? ''))
  const direction = ascending ? 1 : -1

  return rows
    .map((_, i) => i)
    .sort((a, b) => {
      const textA = cell(a).trim()
      const textB = cell(b).trim()

      if (textA === '' && textB === '') return a - b
      if (textA === '') return EMPTY_LAST
      if (textB === '') return -EMPTY_LAST

      const d =
        kind === 'number' ? (asNumber(textA) ?? 0) - (asNumber(textB) ?? 0)
        : kind === 'date' ? (asDate(textA) ?? 0) - (asDate(textB) ?? 0)
        : textCompare.compare(textA, textB)

      return d !== 0 ? d * direction : a - b
    })
}

export interface RememberedSorting {
  key: string
  ascending: boolean
}

function readSorting(raw: unknown): RememberedSorting | null {
  if (!isUnread<RememberedSorting>(raw)) return null
  const key = typeof raw.key === 'string' ? raw.key.trim() : ''
  if (key === '') return null
  return { key, ascending: raw.ascending !== false }
}

export const rememberedSorting = makeOperatorState('ff_sorting_', 'ff_sortierung_', readSorting)

export function totalText(values: readonly string[], min: number, max: number): string {
  let total = 0
  let counted = 0
  for (const value of values) {
    const number = asNumber(value)
    if (number === null) continue
    total += number
    counted++
  }
  if (counted === 0) return ''
  return total.toLocaleString('de-DE', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })
}

export const TOTAL_DECIMALS = { min: 0, max: 3 } as const
