import type { ListGroup } from '@/editor/widgets/List'
import { DECIMALS_MAX, type Calculation, type Term, type TermOrigin, type UnitsTerm } from '../../core/data/calculation'
import { numberText } from '../../core/data/number'
import { decodeOrigin, encodeOrigin, originKey, originName, originOf, originsOf, valueName } from '../origin/origins'
import type { Reach } from '../origin/reach'

// What a sentence can read: the column it is told from, and the columns of
// the row and the fields of the helper sources as the reach of the block.
export interface Names {
  lead: string
  reach: Reach
}

export const FIXED = 'Feste Zahl'
export const UNITS = 'Faktor aus zwei Einheiten'

export const columnTitle = (names: Names, key: string): string => valueName({ kind: 'row', value: key }, names.reach)

export function pairsText(term: UnitsTerm): string {
  return term.table.map((p) => `${p.first}/${p.second} ${numberText(p.factor, DECIMALS_MAX)}`).join(', ')
}

export function termName(term: Term, names: Names): string {
  if (term.kind !== 'units') return valueName(term, names.reach)
  const first = term.first === undefined ? '' : valueName(term.first, names.reach)
  const second = term.second === undefined ? '' : valueName(term.second, names.reach)
  return first !== '' && second !== '' ? `Faktor(${first}/${second})` : 'Faktor'
}

// The sentence as the column head would say it.
export function sentenceText(b: Calculation, names: Names): string {
  const words = b.terms.map((t, i) => {
    const sign = t.divides ? '÷' : '×'
    const name = termName(t, names)
    return i === 0 && !t.divides ? name : `${sign} ${name}`
  })
  const lead = columnTitle(names, b.lead)
  if (words.length === 0) return `${lead} =`
  return `${lead} = ${words.join(' ')}, gerundet auf ${b.decimals} Stellen`
}

// ----- where a term comes from, in two steps: the origin, then the entry -----

// A listed value as a term reads it; nothing for a value no term reads.
export function termOrigin(value: string): TermOrigin | undefined {
  const o = decodeOrigin(value)
  return o.kind === 'row' || o.kind === 'helper' || o.kind === 'fixed' ? o : undefined
}

export const termOriginKey = (term: Term): string => (term.kind === 'units' ? 'units' : originKey(term))

export function originGroups(names: Names): ListGroup[] {
  return [
    { key: 'mask', entries: originsOf(names.reach).map((o) => ({ value: o.key, name: o.name })) },
    { key: 'more', entries: [{ value: 'fixed', name: FIXED }, { value: 'units', name: UNITS }] },
  ]
}

export function originText(key: string, names: Names): string {
  if (key === 'fixed') return FIXED
  if (key === 'units') return UNITS
  return originName(key, names.reach)
}

// The columns of the row but the lead, or the fields of one helper source.
export function entryGroups(key: string, names: Names): ListGroup[] {
  const lead = encodeOrigin({ kind: 'row', value: names.lead })
  const entries = (originOf(key, names.reach)?.entries ?? []).filter((e) => e.value !== lead)
  return entries.length > 0 ? [{ key, entries }] : []
}

// The two units of a factor read any column of the row or field of a helper source.
export const unitGroups = (names: Names): ListGroup[] =>
  originsOf(names.reach).map((o) => ({ key: o.key, name: o.name, entries: o.entries }))
