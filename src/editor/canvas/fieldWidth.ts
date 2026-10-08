const CHARACTER_PX = 7
const PADDING_PX = 20

export function widthFromLength(length: number | undefined): number | undefined {
  if (length === undefined || !Number.isFinite(length) || length < 1) return undefined
  return Math.round(length) * CHARACTER_PX + PADDING_PX
}
