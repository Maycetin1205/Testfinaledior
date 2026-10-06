import { bindingWithSource } from '../block/binding'
import { isUnread } from '../unread'
import { asNumber, numberText, roundTo } from './number'
import type { ValueOrigin } from './valueOrigin'

// A calculation is one sentence at a column head: the column equals its
// terms, each one multiplied or divided. In a row, the one column of the
// sentence that stands empty is computed from the others; a row with none
// or with two empty columns is left alone.

interface UnitPair {
  first: string
  second: string
  factor: number
}

// A term takes its value from a column of the row, a field of a helper
// source or a typed number; or it is the factor a table gives for the two
// units the row holds, 1 when no pair of the table fits.
export type Term =
  | (ValueOrigin & { divides: boolean })
  | UnitsTerm

export interface UnitsTerm {
  kind: 'units'
  first?: ValueOrigin
  second?: ValueOrigin
  table: UnitPair[]
  divides: boolean
}

export interface Calculation {
  key: string

  // The column the sentence is told from.
  lead: string

  terms: Term[]

  decimals: number
}

export const CALCULATIONS_PROP = 'calculations'

export const DECIMALS_MAX = 6

const DECIMALS_DEFAULT = 2

// ----- computing -----

// What a term reads in a row; '' when the place is empty or not there.
type Read = (origin: ValueOrigin) => string

interface Member {
  left: boolean
  value: number
}

const product = (members: readonly Member[]): number => members.reduce((a, m) => a * m.value, 1)

function unitFactor(term: UnitsTerm, read: Read): number {
  const first = term.first === undefined ? '' : read(term.first).trim()
  const second = term.second === undefined ? '' : read(term.second).trim()
  return term.table.find((p) => p.first === first && p.second === second)?.factor ?? 1
}

interface Solved {
  slot: number
  text: string
}

// The lead stands on the left, a dividing term beside it, a multiplying term
// on the right: lead × dividers = multipliers. The one empty column is the
// other side divided by the rest of its own. Null when no column or more
// than one stands empty, or another value is missing or no number.
function solve(b: Calculation, slotOf: (column: string) => number, read: Read): Solved | null {
  const members: Member[] = []
  const places: { origin: ValueOrigin; left: boolean }[] = [{ origin: { kind: 'row', value: b.lead }, left: true }]
  for (const term of b.terms) {
    if (term.kind === 'units') members.push({ left: term.divides, value: unitFactor(term, read) })
    else places.push({ origin: term, left: term.divides })
  }
  let gap: { slot: number; left: boolean } | null = null
  for (const { origin, left } of places) {
    const text = read(origin).trim()
    if (text !== '') {
      const number = asNumber(text)
      if (number === null) return null
      members.push({ left, value: number })
      continue
    }
    const slot = origin.kind === 'row' ? slotOf(origin.value) : -1
    if (slot === -1 || gap !== null) return null
    gap = { slot, left }
  }
  if (gap === null) return null
  const { slot, left } = gap
  const own = product(members.filter((m) => m.left === left))
  const other = product(members.filter((m) => m.left !== left))
  const value = roundTo(other / own, b.decimals)
  if (!Number.isFinite(value)) return null
  return { slot, text: numberText(value, b.decimals) }
}

// The computed cells of a row, by slot. A cell reads as the row gives it, a
// helper field as the row's record for that source gives it; one sentence's
// result feeds the next.
export function rowValues(
  calculations: readonly Calculation[],
  slotOf: (column: string) => number,
  cell: (slot: number) => string,
  helper: (sourceId: string | undefined, field: string) => string = () => '',
): Map<number, string> {
  const values = new Map<number, string>()
  const read: Read = (origin) => {
    switch (origin.kind) {
      case 'row': {
        const slot = slotOf(origin.value)
        return slot === -1 ? '' : values.get(slot) ?? cell(slot)
      }
      case 'helper': return helper(origin.sourceId, origin.value)
      case 'fixed': return origin.value
      default: return ''
    }
  }
  for (let round = 0; round < calculations.length; round++) {
    let filled = false
    for (const b of calculations) {
      const solved = solve(b, slotOf, read)
      if (solved === null) continue
      values.set(solved.slot, solved.text)
      filled = true
    }
    if (!filled) break
  }
  return values
}

// ----- what a sentence names -----

// The columns of a sentence: the lead and every term that is a column.
function columnsOf(b: Calculation): string[] {
  return [b.lead, ...b.terms.flatMap((t) => (t.kind === 'row' ? [t.value] : []))]
}

export function columnSlots(
  calculations: readonly Calculation[],
  slotOf: (column: string) => number,
): Set<number> {
  const out = new Set<number>()
  for (const b of calculations) {
    for (const column of columnsOf(b)) {
      const slot = slotOf(column)
      if (slot !== -1) out.add(slot)
    }
  }
  return out
}

function originsOf(b: Calculation): ValueOrigin[] {
  return b.terms.flatMap((t) => (t.kind === 'units'
    ? [t.first, t.second].filter((o): o is ValueOrigin => o !== undefined)
    : [t]))
}

// The fields of helper sources the sentences read, as bindings.
export function fieldBindingsFrom(raw: unknown): string[] {
  const out: string[] = []
  for (const b of calculationsFrom(raw)) {
    for (const o of originsOf(b)) {
      if (o.kind !== 'helper') continue
      const binding = bindingWithSource(o.sourceId ?? '', o.value)
      if (!out.includes(binding)) out.push(binding)
    }
  }
  return out
}

// The same sentence told from another of its columns: the lead moves into
// the terms, the column moves out, what multiplies comes first. Null when
// the column is not in it.
export function toldFrom(b: Calculation, column: string): Calculation | null {
  if (b.lead === column) return b
  const at = b.terms.findIndex((t) => t.kind === 'row' && t.value === column)
  if (at === -1) return null
  const own = b.terms[at]
  const rest = b.terms
    .filter((_, i) => i !== at)
    .map((t) => (own.divides ? t : { ...t, divides: !t.divides }))
  const terms: Term[] = [{ kind: 'row', value: b.lead, divides: own.divides }, ...rest]
  return { ...b, lead: column, terms: [...terms.filter((t) => !t.divides), ...terms.filter((t) => t.divides)] }
}

export function newCalculation(present: readonly Calculation[], lead: string): Calculation {
  const taken = new Set(present.map((b) => b.key))
  let n = present.length + 1
  while (taken.has(`c${n}`)) n++
  return { key: `c${n}`, lead, terms: [], decimals: DECIMALS_DEFAULT }
}

// ----- reading and writing -----

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const ORIGIN_KINDS = ['row', 'helper', 'fixed'] as const

function originFrom(raw: unknown): ValueOrigin | undefined {
  if (!isUnread<ValueOrigin>(raw)) return undefined
  const kind = ORIGIN_KINDS.find((k) => k === raw.kind)
  const value = text(raw.value)
  if (kind === undefined || value === '') return undefined
  const sourceId = text(raw.sourceId)
  return sourceId === '' ? { kind, value } : { kind, sourceId, value }
}

function unitPairsFrom(raw: unknown): UnitPair[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry): UnitPair[] => {
    if (!isUnread<UnitPair>(entry)) return []
    const factor = typeof entry.factor === 'number' && Number.isFinite(entry.factor) ? entry.factor : 1
    return [{ first: text(entry.first), second: text(entry.second), factor }]
  })
}

function termFrom(raw: unknown): Term | undefined {
  if (!isUnread<Term>(raw)) return undefined
  const divides = raw.divides === true
  if (raw.kind === 'units') {
    const first = originFrom(raw.first)
    const second = originFrom(raw.second)
    return {
      kind: 'units',
      ...(first === undefined ? {} : { first }),
      ...(second === undefined ? {} : { second }),
      table: unitPairsFrom(raw.table),
      divides,
    }
  }
  const origin = originFrom(raw)
  return origin === undefined ? undefined : { ...origin, divides }
}

function decimalsFrom(raw: unknown): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= DECIMALS_MAX
    ? raw
    : DECIMALS_DEFAULT
}

export function calculationsFrom(raw: unknown): Calculation[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry, i): Calculation[] => {
    if (!isUnread<Calculation>(entry)) return []
    const terms = Array.isArray(entry.terms)
      ? entry.terms.flatMap((t): Term[] => {
          const term = termFrom(t)
          return term === undefined ? [] : [term]
        })
      : []
    const key = text(entry.key)
    return [{
      key: key === '' ? `c${i + 1}` : key,
      lead: text(entry.lead),
      terms,
      decimals: decimalsFrom(entry.decimals),
    }]
  })
}

// Only a sentence with a lead and a term goes out; a term says "divides"
// only when it does.
export function calculationsForExport(calculations: readonly Calculation[]): unknown[] {
  return calculations
    .filter((b) => b.lead !== '' && b.terms.length > 0)
    .map((b) => ({
      ...b,
      terms: b.terms.map(({ divides, ...term }) => (divides ? { ...term, divides } : term)),
    }))
}
