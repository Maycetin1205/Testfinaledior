import { splitBinding } from '../../core/block/blockType'
import type { SourceInReach } from '../../core/data/extraSources'

const ICON_PX = 7
const PADDING_PX = 20

export function widthFromIcon(icon: number | undefined): number | undefined {
  if (icon === undefined || !Number.isFinite(icon) || icon < 1) return undefined
  return Math.round(icon) * ICON_PX + PADDING_PX
}

export function iconOf(
  value: string,
  sources: readonly SourceInReach[],
): number | undefined {
  const { sourceId, code } = splitBinding(value)
  const source = sourceId === ''
    ? sources[0]?.source
    : sources.find((q) => q.source.id === sourceId)?.source
  return source?.fields.find((f) => f.code === code)?.icon
}
