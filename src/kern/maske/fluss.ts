// Die Fluss-Angaben eines Bausteins: Richtung, Breite, Hoehe.
import type { BausteinArt } from './bausteinArt'

export type Richtung = 'column' | 'row'
export type FlussBreite = 'auto' | 'fill' | number

export type FlussHoehe = 'auto' | 'fill' | number

export function richtungDerKinder(
  def: Pick<BausteinArt, 'childDirection'> | undefined,
  props: Record<string, unknown>,
): Richtung {
  if (props.direction === 'row') return 'row'
  if (props.direction === 'column') return 'column'
  return def?.childDirection ?? 'column'
}

export const WURZEL_FLUSS = { gap: 12, padding: 16 } as const

export const FLUSS_VORGABEN: Record<string, unknown> = { width: 'auto' }

export function flussBreiteLesen(value: unknown): FlussBreite {
  if (value === 'fill') return 'fill'
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  return 'auto'
}

export function flussHoeheLesen(value: unknown): FlussHoehe {
  if (value === 'fill') return 'fill'
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  return 'auto'
}

export function flussHoeheStil(
  height: FlussHoehe,
  parentDirection: Richtung,
): Record<string, string | number> {
  if (height === 'fill') {
    return parentDirection === 'column'
      ? { flexGrow: 1, flexBasis: 0, minHeight: 0 }
      : { alignSelf: 'stretch', minHeight: 0 }
  }
  if (typeof height === 'number') {
    return { height: `${height}px`, flexShrink: 0 }
  }
  return {}
}

export function flussBreiteStil(
  width: FlussBreite,
  parentDirection: Richtung,
  lockedWidth?: FlussBreite,
): Record<string, string | number> {
  const effective = lockedWidth ?? width
  if (effective === 'fill') {
    return parentDirection === 'row'
      ? { flexGrow: 1, flexBasis: 0, minWidth: 0 }
      : { alignSelf: 'stretch' }
  }
  if (typeof effective === 'number') {
    return { width: `${effective}px`, flexShrink: 0 }
  }
  return {}
}
