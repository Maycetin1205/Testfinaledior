import type { BlockType } from './blockType'
import { structuredProperty, type Property } from './property'

export type Direction = 'column' | 'row'
export type FlowWidth = 'auto' | 'fill' | number

export type FlowHeight = 'auto' | 'fill' | number

export function directionTheChildren(
  def: Pick<BlockType, 'childDirection'> | undefined,
  props: Record<string, unknown>,
): Direction {
  if (props.direction === 'row') return 'row'
  if (props.direction === 'column') return 'column'
  return def?.childDirection ?? 'column'
}

export const ROOT_FLOW = { gap: 12, padding: 16 } as const

// Dragged on the canvas, not typed in the inspector, and written as an
// inline style rather than an attribute.
export const widthProperty: Property<FlowWidth> = structuredProperty<FlowWidth>({
  read: (raw) => (typeof raw === 'string' || typeof raw === 'number'
    ? { ok: true, value: flowWidthRead(raw) }
    : { ok: false, reason: 'Breite erwartet' }),
  toAttribute: (value) => String(value),
  fromAttribute: (raw, fallback) => (raw === null ? fallback : flowWidthRead(raw)),
}, { default: 'auto', label: 'Breite', help: 'Wie breit der Baustein im Fluss liegt.', place: 'none' })

export function flowWidthRead(value: unknown): FlowWidth {
  if (value === 'fill') return 'fill'
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  return 'auto'
}

export function flowHeightRead(value: unknown): FlowHeight {
  if (value === 'fill') return 'fill'
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  return 'auto'
}

export function flowHeightStyle(
  height: FlowHeight,
  parentDirection: Direction,
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

export function flowWidthStyle(
  width: FlowWidth,
  parentDirection: Direction,
  lockedWidth?: FlowWidth,
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
