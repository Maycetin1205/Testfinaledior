import { makeOperatorState } from './operatorState'

const EMPTY_LAST = 1

const NUMBER = /^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$|^-?\d+(,\d+)?$|^-?\d+(\.\d+)?$/

const DATE_DE = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

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
  const t = value.trim()
  if (t === '') return null

  const iso = DATE_ISO.exec(t)
  if (iso) {
    const [, j, m, tg] = iso
    return timeValue(Number(j), Number(m), Number(tg))
  }

  const de = DATE_DE.exec(t)
  if (de) {
    const [, tg, m, jRaw] = de

    const jNumber = Number(jRaw)
    const year = jRaw.length === 2 ? (jNumber <= 69 ? 2000 + jNumber : 1900 + jNumber) : jNumber
    return timeValue(year, Number(m), Number(tg))
  }

  return null
}

function timeValue(year: number, month: number, tag: number): number | null {
  if (month < 1 || month > 12 || tag < 1 || tag > 31) return null
  const d = new Date(year, month - 1, tag)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== tag) return null
  return d.getTime()
}

type Kind = 'number' | 'date' | 'text'

function detectKind(values: readonly string[]): Kind {
  let filled = 0
  let numbers = 0
  let data = 0
  for (const w of values) {
    if (w.trim() === '') continue
    filled++
    if (asNumber(w) !== null) numbers++
    if (asDate(w) !== null) data++
  }
  if (filled === 0) return 'text'
  if (data === filled) return 'date'
  if (numbers === filled) return 'number'
  return 'text'
}

const textCompare = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

export function sortIndizes(
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
      const wa = cell(a).trim()
      const wb = cell(b).trim()

      if (wa === '' && wb === '') return a - b
      if (wa === '') return EMPTY_LAST
      if (wb === '') return -EMPTY_LAST

      const d =
        kind === 'number' ? (asNumber(wa) ?? 0) - (asNumber(wb) ?? 0)
        : kind === 'date' ? (asDate(wa) ?? 0) - (asDate(wb) ?? 0)
        : textCompare.compare(wa, wb)

      return d !== 0 ? d * direction : a - b
    })
}

export interface RememberedSorting {
  key: string
  on: boolean
}

function readSorting(raw: unknown): RememberedSorting | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  const key = typeof o.key === 'string' ? o.key.trim() : ''
  if (key === '') return null
  return { key, on: o.on !== false }
}

export const rememberedSorting = makeOperatorState('ff_sortierung_', readSorting)

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

export const TOTAL_NACHKOMMA = { min: 0, max: 3 } as const
