import {
  fromBase,
  dimensionsText,
  dimensionsEqual,
  dimensionsWith,
  UNIT_DEFAULT,
  unitShort,
  NO_DIMENSIONS,
  inBase,
  type Dimensions,
} from './units'

export type RoundingDirection = 'on' | 'off' | 'kfm'

export interface Rounding {
  spots: number
  direction: RoundingDirection
}

const ROUND_DEFAULT: Rounding = { spots: 3, direction: 'kfm' }

export const SPOTS_MAX = 6

const STRICT = /^-?\d+(,\d+)?$|^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/

export function numberStrict(text: string): number | null {
  const t = text.trim()
  if (t === '' || !STRICT.test(t)) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function roundValue(value: number, round: Rounding): number {
  const f = Math.pow(10, Math.max(0, round.spots))
  const x = value * f

  const coarse = round.direction === 'on'
    ? Math.ceil(x - 1e-9)
    : round.direction === 'off' ? Math.floor(x + 1e-9) : Math.round(x)
  return coarse / f
}

export function numberText(value: number, spots: number): string {
  return value.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, spots),
  })
}

function asRounding(raw: unknown): Rounding {
  if (!raw || typeof raw !== 'object') return { ...ROUND_DEFAULT }
  const o = raw as Record<string, unknown>
  const spots = typeof o.spots === 'number' && Number.isInteger(o.spots)
    && o.spots >= 0 && o.spots <= SPOTS_MAX
    ? o.spots
    : ROUND_DEFAULT.spots
  const direction = o.direction === 'on' || o.direction === 'off' || o.direction === 'kfm'
    ? o.direction
    : ROUND_DEFAULT.direction
  return { spots, direction }
}

export interface ColumnsFactor {
  kind: 'column'
  key: string

  column: string
  unit: string

  result: boolean

  round: Rounding
}

export interface DataFactor {
  kind: 'dataField'
  key: string

  name: string

  field: string
  unit: string
}

export interface NumberFactor {
  kind: 'number'
  key: string
  name: string
  number: number
  unit: string
}

export type Factor = ColumnsFactor | DataFactor | NumberFactor

export interface Calculation {
  key: string
  name: string

  lead: ColumnsFactor
  numerator: readonly Factor[]
  denominator: readonly Factor[]
}

export const CALCULATIONS_PROP = 'calculations'

export function allFactors(b: Calculation): Factor[] {
  return [b.lead, ...b.numerator, ...b.denominator]
}

function sides(b: Calculation): { left: Factor[]; right: Factor[] } {
  return { left: [b.lead, ...b.denominator], right: [...b.numerator] }
}

function resultFactors(b: Calculation): ColumnsFactor[] {
  return allFactors(b).filter(
    (f): f is ColumnsFactor => f.kind === 'column' && f.result && f.column !== '',
  )
}

export function factorName(f: Factor, columnsTitle: (key: string) => string): string {
  if (f.kind !== 'column') return f.name === '' ? '?' : f.name
  const title = columnsTitle(f.column)
  return title === '' ? '?' : title
}

export function directionAsText(
  b: Calculation,
  key: string,
  columnsTitle: (key: string) => string,
): string {
  const { left, right } = sides(b)
  const target = allFactors(b).find((f) => f.key === key)
  if (target === undefined) return ''
  const own = left.some((f) => f.key === key) ? left : right
  const other = own === left ? right : left
  const name = (f: Factor): string => factorName(f, columnsTitle)
  const top = other.map(name).join(' × ')
  const bottom = own.filter((f) => f.key !== key).map(name)
  const rest = bottom.length === 0 ? '' : ` ÷ ${bottom.join(' ÷ ')}`
  return `${name(target)} = ${top}${rest}`
}

export type FactorState =
  | { kind: 'number'; number: number }
  | { kind: 'empty' }
  | { kind: 'invalid'; text: string }

  | { kind: 'withoutRecord' }

  | { kind: 'notLoaded' }

export type CalculationPlacement =

  | { kind: 'result'; key: string; column: string; number: number; text: string }

  | { kind: 'open' }

  | { kind: 'consistent' }

  | { kind: 'contradiction'; text: string }

  | { kind: 'incomplete'; text: string }

const NEAR_ZERO = 1e-12

function product(values: readonly number[]): number {
  return values.reduce((a, b) => a * b, 1)
}

function unitsProbe(b: Calculation): string {
  const { left, right } = sides(b)
  const dimensionsOf = (factors: readonly Factor[]): Dimensions | null => {
    let dimensions: Dimensions | null = NO_DIMENSIONS
    for (const f of factors) {
      if (dimensions === null) return null
      dimensions = dimensionsWith(dimensions, f.unit, 1)
    }
    return dimensions
  }
  const l = dimensionsOf(left)
  const r = dimensionsOf(right)
  if (l === null || r === null) return 'Eine Einheit ist unbekannt.'
  if (dimensionsEqual(l, r)) return ''
  return `Die Einheiten passen nicht zusammen: links ${dimensionsText(l)}, rechts ${dimensionsText(r)}.`
}

interface Weighted {
  factor: Factor
  side: 'left' | 'right'
  state: FactorState

  base: number | null
}

function weigh(b: Calculation, stateOf: (f: Factor) => FactorState): Weighted[] | string {
  const { left, right } = sides(b)
  const out: Weighted[] = []
  for (const [side, factors] of [['left', left], ['right', right]] as const) {
    for (const factor of factors) {
      const state = stateOf(factor)
      if (state.kind === 'number') {
        const base = inBase(state.number, factor.unit)
        if (base === null) return `Die Einheit von „${factor.key}" ist unbekannt.`
        out.push({ factor, side, state, base })
      } else {
        out.push({ factor, side, state, base: null })
      }
    }
  }
  return out
}

function fault(g: Weighted, name: (f: Factor) => string): string {
  if (g.state.kind === 'invalid') {
    return `„${name(g.factor)}" ist keine Zahl: ${g.state.text}`
  }
  if (g.state.kind === 'withoutRecord') {
    return `Für „${name(g.factor)}" ist kein Datensatz zugeordnet.`
  }
  if (g.state.kind === 'notLoaded') {
    return `„${name(g.factor)}" ist noch nicht geladen.`
  }
  return ''
}

function resolve(all: readonly Weighted[], target: Weighted): number | 'divisionByZero' | null {
  const withoutTarget = all.filter((g) => g !== target)
  if (withoutTarget.some((g) => g.base === null)) return null
  const own = withoutTarget.filter((g) => g.side === target.side).map((g) => g.base as number)
  const other = withoutTarget.filter((g) => g.side !== target.side).map((g) => g.base as number)
  const divider = product(own)
  if (Math.abs(divider) < NEAR_ZERO) return 'divisionByZero'
  const value = product(other) / divider
  return Number.isFinite(value) ? value : null
}

export function computeCalculation(
  b: Calculation,
  stateOf: (f: Factor) => FactorState,
  columnsTitle: (key: string) => string,
  flaws: readonly string[] = [],
): CalculationPlacement {
  const name = (f: Factor): string => factorName(f, columnsTitle)
  if (flaws.length > 0) return { kind: 'incomplete', text: flaws[0] }
  const probe = unitsProbe(b)
  if (probe !== '') return { kind: 'incomplete', text: probe }

  const weighted = weigh(b, stateOf)
  if (typeof weighted === 'string') return { kind: 'incomplete', text: weighted }

  for (const g of weighted) {
    const text = fault(g, name)
    if (text !== '') return { kind: 'incomplete', text }
  }

  const gaps = weighted.filter((g) => g.base === null)
  if (gaps.length > 1) return { kind: 'open' }

  if (gaps.length === 1) {
    const target = gaps[0]
    const f = target.factor
    if (f.kind !== 'column' || !f.result) return { kind: 'open' }
    const base = resolve(weighted, target)
    if (base === 'divisionByZero') {
      return { kind: 'incomplete', text: `„${name(f)}" ließe sich nur durch Teilen durch null berechnen.` }
    }
    if (base === null) return { kind: 'open' }
    const value = fromBase(base, f.unit)
    if (value === null || !Number.isFinite(value)) {
      return { kind: 'incomplete', text: `„${name(f)}" ergibt keine brauchbare Zahl.` }
    }
    const rounded = roundValue(value, f.round)
    return {
      kind: 'result',
      key: f.key,
      column: f.column,
      number: rounded,
      text: numberText(rounded, f.round.spots),
    }
  }

  const checkable = weighted.filter((g) => g.factor.kind === 'column' && g.factor.result)
  if (checkable.length === 0) return { kind: 'consistent' }
  const deviations: string[] = []
  for (const g of checkable) {
    const f = g.factor as ColumnsFactor
    const base = resolve(weighted, g)
    if (base === 'divisionByZero' || base === null) continue
    const expected = fromBase(base, f.unit)
    if (expected === null || !Number.isFinite(expected)) continue
    const actual = fromBase(g.base as number, f.unit) as number
    const step = Math.pow(10, -Math.max(0, f.round.spots))
    if (Math.abs(expected - actual) <= step / 2 + 1e-9) return { kind: 'consistent' }
    deviations.push(
      `${name(f)} ${numberText(actual, f.round.spots)} statt ${numberText(roundValue(expected, f.round), f.round.spots)} ${unitShort(f.unit)}`.trim(),
    )
  }
  if (deviations.length === 0) return { kind: 'consistent' }
  return {
    kind: 'contradiction',
    text: `Die Werte passen nicht zusammen (${b.name}): ${deviations.join('; ')}.`,
  }
}

export interface RowValue {
  number: number
  text: string
}

export interface RowMath {
  values: ReadonlyMap<number, RowValue>

  placements: ReadonlyMap<string, CalculationPlacement>
}

export function computeRow(
  calculations: readonly Calculation[],
  slotOf: (columnsKey: string) => number,
  stateOf: (f: Factor) => FactorState,
  flawsOf: (b: Calculation) => readonly string[],
  columnsTitle: (key: string) => string,
): RowMath {
  const values = new Map<number, RowValue>()
  const placements = new Map<string, CalculationPlacement>()
  const state = (f: Factor): FactorState => {
    if (f.kind === 'column') {
      const value = values.get(slotOf(f.column))
      if (value !== undefined) return { kind: 'number', number: value.number }
    }
    return stateOf(f)
  }
  for (let round = 0; round <= calculations.length; round++) {
    let filled = false
    for (const b of calculations) {
      if (placements.get(b.key)?.kind === 'result') continue
      const placement = computeCalculation(b, state, columnsTitle, flawsOf(b))
      if (placement.kind === 'result') {
        const slot = slotOf(placement.column)
        if (slot !== -1 && !values.has(slot)) {
          values.set(slot, { number: placement.number, text: placement.text })
          filled = true
        }
      }
      placements.set(b.key, placement)
    }
    if (!filled) break
  }
  return { values, placements }
}

export function addRow(
  calculations: readonly Calculation[],
  slotOf: (columnsKey: string) => number,
  given: (slot: number) => string,
  numberOf: (text: string) => number | null,
): ReadonlyMap<number, RowValue> {
  if (calculations.length === 0) return new Map()
  return computeRow(
    calculations,
    slotOf,
    (f) => {
      if (f.kind === 'number') return { kind: 'number', number: f.number }
      if (f.kind === 'dataField') return { kind: 'withoutRecord' }
      const slot = slotOf(f.column)
      const text = slot === -1 ? '' : given(slot).trim()
      if (text === '') return { kind: 'empty' }
      const number = numberOf(text)
      return number === null ? { kind: 'invalid', text } : { kind: 'number', number }
    },
    () => [],
    () => '',
  ).values
}

export function resultSlots(
  calculations: readonly Calculation[],
  slotOf: (columnsKey: string) => number,
): Set<number> {
  const out = new Set<number>()
  for (const b of calculations) {
    for (const f of resultFactors(b)) {
      const slot = slotOf(f.column)
      if (slot !== -1) out.add(slot)
    }
  }
  return out
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function asFactor(raw: unknown, index: number): Factor | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const key = text(o.key) === '' ? `f${index}` : text(o.key)
  const unit = text(o.unit) === '' ? UNIT_DEFAULT : text(o.unit)
  if (o.kind === 'dataField') {
    return { kind: 'dataField', key, name: text(o.name), field: text(o.field), unit }
  }
  if (o.kind === 'number') {
    const number = typeof o.number === 'number' && Number.isFinite(o.number) ? o.number : 1
    return { kind: 'number', key, name: text(o.name), number, unit }
  }
  return {
    kind: 'column',
    key,
    column: text(o.column),
    unit,
    result: o.result !== false,
    round: asRounding(o.round),
  }
}

function asLead(raw: unknown, index: number): ColumnsFactor {
  const factor = asFactor(raw, index)

  if (factor === null || factor.kind !== 'column') {
    return {
      kind: 'column',
      key: `f${index}`,
      column: '',
      unit: UNIT_DEFAULT,
      result: true,
      round: { ...ROUND_DEFAULT },
    }
  }
  return { ...factor, result: true }
}

function asList(raw: unknown, offset: number): Factor[] {
  if (!Array.isArray(raw)) return []
  const out: Factor[] = []
  raw.forEach((entry, i) => {
    const factor = asFactor(entry, offset + i)
    if (factor !== null) out.push(factor)
  })
  return out
}

function withUniqueKeys(b: Calculation): Calculation {
  const taken = new Set<string>()
  let counter = 0
  const unique = <T extends Factor>(f: T): T => {
    let key = f.key
    while (key === '' || taken.has(key)) key = `f${++counter}`
    taken.add(key)
    return key === f.key ? f : { ...f, key }
  }
  return {
    ...b,
    lead: unique(b.lead),
    numerator: b.numerator.map(unique),
    denominator: b.denominator.map(unique),
  }
}

export function calculationsFrom(raw: unknown): Calculation[] {
  if (!Array.isArray(raw)) return []
  const out: Calculation[] = []
  raw.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') return
    const o = entry as Record<string, unknown>
    const numerator = asList(o.numerator, 100)
    const denominator = asList(o.denominator, 200)
    out.push(withUniqueKeys({
      key: text(o.key) === '' ? `b${i + 1}` : text(o.key),
      name: text(o.name) === '' ? `Berechnung ${i + 1}` : text(o.name),
      lead: asLead(o.lead, 0),
      numerator,
      denominator,
    }))
  })
  return out
}

export function calculationsForExport(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw
  return raw.filter((entry) => calculationsFrom([entry])
    .some((b) => allFactors(b).some((f) => f.kind === 'column' && f.column !== '')))
}

export function newFactor(key: string): ColumnsFactor {
  return {
    kind: 'column',
    key,
    column: '',
    unit: UNIT_DEFAULT,
    result: true,
    round: { ...ROUND_DEFAULT },
  }
}

function freeCalculationKey(present: readonly Calculation[]): string {
  let n = present.length + 1
  const taken = new Set(present.map((b) => b.key))
  while (taken.has(`b${n}`)) n++
  return `b${n}`
}

export function newCalculation(present: readonly Calculation[]): Calculation {
  const key = freeCalculationKey(present)
  return {
    key,
    name: `Berechnung ${key.slice(1)}`,
    lead: newFactor('f0'),
    numerator: [newFactor('f100')],
    denominator: [],
  }
}

export function freeFactorKey(b: Calculation): string {
  const taken = new Set(allFactors(b).map((f) => f.key))
  let n = 1
  while (taken.has(`f${n}`)) n++
  return `f${n}`
}

export function calculationFlaws(
  b: Calculation,
  columnsTitle: (key: string) => string | null,
  fieldName: (field: string) => string | null,
): string[] {
  const flaws: string[] = []
  const name = (f: Factor): string => factorName(f, (k) => columnsTitle(k) ?? '')
  if (b.numerator.length === 0) flaws.push('Der Berechnung fehlt der rechte Teil der Formel.')
  for (const f of allFactors(b)) {
    if (f.kind === 'column') {
      if (f.column === '') {
        flaws.push('Eine Größe der Berechnung hat noch keine Spalte.')
      } else if (columnsTitle(f.column) === null) {
        flaws.push(`Die Spalte einer Größe der Berechnung gibt es nicht mehr (${f.column}).`)
      }
      continue
    }
    if (f.kind === 'dataField') {
      if (f.field === '') flaws.push(`„${name(f)}" hat noch kein Datenfeld.`)
      else if (fieldName(f.field) === null) {
        flaws.push(`Das Datenfeld von „${name(f)}" gibt es nicht mehr.`)
      }
    }
  }
  if (resultFactors(b).length === 0) {
    flaws.push('Keine Größe der Berechnung darf Ergebnis sein.')
  }
  const probe = unitsProbe(b)
  if (probe !== '') flaws.push(probe)
  return flaws
}

export function dataFieldsFrom(raw: unknown): string[] {
  const out: string[] = []
  for (const b of calculationsFrom(raw)) {
    for (const f of allFactors(b)) {
      if (f.kind === 'dataField' && f.field !== '' && !out.includes(f.field)) out.push(f.field)
    }
  }
  return out
}
