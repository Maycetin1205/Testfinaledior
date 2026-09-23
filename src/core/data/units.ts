export type UnitKind = 'sizes' | 'volumen' | 'zaehlend'

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
  { code: 'l', name: 'Liter', short: 'l', kind: 'volumen', factor: 1000 },
  { code: 'ml', name: 'Milliliter', short: 'ml', kind: 'volumen', factor: 1 },
  { code: 'count', name: 'Anzahl', short: '', kind: 'zaehlend', factor: 1 },
  { code: 'tag', name: 'Tage', short: 'Tage', kind: 'zaehlend', factor: 1 },
]

export const UNIT_STANDARD = 'count'

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

export type SizeImage = Readonly<Record<'sizes' | 'volumen', number>>

export const SIZE_IMAGE_EMPTY: SizeImage = { sizes: 0, volumen: 0 }

export function pictureWith(picture: SizeImage, code: string, times: 1 | -1): SizeImage | null {
  const unit = unitOf(code)
  if (unit === undefined) return null
  if (unit.kind === 'zaehlend') return picture
  return { ...picture, [unit.kind]: picture[unit.kind] + times }
}

export function picturesEquals(a: SizeImage, b: SizeImage): boolean {
  return a.sizes === b.sizes && a.volumen === b.volumen
}

const KIND_NAME: Record<'sizes' | 'volumen', string> = { sizes: 'Masse', volumen: 'Volumen' }

export function pictureAsText(picture: SizeImage): string {
  const parts: string[] = []
  for (const kind of ['sizes', 'volumen'] as const) {
    const n = picture[kind]
    if (n === 0) continue
    parts.push(n === 1 ? KIND_NAME[kind] : `${KIND_NAME[kind]}^${n}`)
  }
  return parts.length === 0 ? 'ohne Größe' : parts.join(' × ')
}
