export type UnitKind = 'sizes' | 'volume' | 'counting'

export interface Unit {
  code: string
  name: string

  short: string
  kind: UnitKind

  factor: number
}

export const UNITS: readonly Unit[] = [
  { code: 'kg', name: 'Kilogramm', short: 'kg', kind: 'sizes', factor: 1000 },
  { code: 'g', name: 'Gramm', short: 'g', kind: 'sizes', factor: 1 },
  { code: 'mg', name: 'Milligramm', short: 'mg', kind: 'sizes', factor: 0.001 },
  { code: 'l', name: 'Liter', short: 'l', kind: 'volume', factor: 1000 },
  { code: 'ml', name: 'Milliliter', short: 'ml', kind: 'volume', factor: 1 },
  { code: 'count', name: 'Anzahl', short: '', kind: 'counting', factor: 1 },
  { code: 'tag', name: 'Tage', short: 'Tage', kind: 'counting', factor: 1 },
]

export const UNIT_DEFAULT = 'count'

function unitOf(code: string): Unit | undefined {
  return UNITS.find((e) => e.code === code)
}

export function unitShort(code: string): string {
  const unit = unitOf(code)
  if (unit === undefined) return code
  return unit.short === '' ? unit.name : unit.short
}

export function inBase(value: number, code: string): number | null {
  const unit = unitOf(code)
  return unit === undefined ? null : value * unit.factor
}

export function fromBase(value: number, code: string): number | null {
  const unit = unitOf(code)
  return unit === undefined ? null : value / unit.factor
}

export type Dimensions = Readonly<Record<'sizes' | 'volume', number>>

export const NO_DIMENSIONS: Dimensions = { sizes: 0, volume: 0 }

export function dimensionsWith(dimensions: Dimensions, code: string, times: 1 | -1): Dimensions | null {
  const unit = unitOf(code)
  if (unit === undefined) return null
  if (unit.kind === 'counting') return dimensions
  return { ...dimensions, [unit.kind]: dimensions[unit.kind] + times }
}

export function dimensionsEqual(a: Dimensions, b: Dimensions): boolean {
  return a.sizes === b.sizes && a.volume === b.volume
}

const KIND_NAME: Record<'sizes' | 'volume', string> = { sizes: 'Masse', volume: 'Volumen' }

export function dimensionsText(dimensions: Dimensions): string {
  const parts: string[] = []
  for (const kind of ['sizes', 'volume'] as const) {
    const n = dimensions[kind]
    if (n === 0) continue
    parts.push(n === 1 ? KIND_NAME[kind] : `${KIND_NAME[kind]}^${n}`)
  }
  return parts.length === 0 ? 'ohne Größe' : parts.join(' × ')
}
