import { splitBinding } from '../../core/block/blockType'
import type { SourceInReach } from '../../core/data/extraSources'

const CHARACTER_PX = 7
const PADDING_PX = 20

export function widthFromLength(length: number | undefined): number | undefined {
  if (length === undefined || !Number.isFinite(length) || length < 1) return undefined
  return Math.round(length) * CHARACTER_PX + PADDING_PX
}

export function lengthOf(
  value: string,
  sources: readonly SourceInReach[],
): number | undefined {
  const { sourceId, code } = splitBinding(value)
  const source = sourceId === ''
    ? sources[0]?.source
    : sources.find((q) => q.source.id === sourceId)?.source
  return source?.fields.find((f) => f.code === code)?.length
}
