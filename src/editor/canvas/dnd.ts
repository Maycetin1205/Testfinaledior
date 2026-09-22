export const NEW_BLOCK_MIME = 'application/x-ff-new-block'

const TYPED_PREFIX = `${NEW_BLOCK_MIME}--`

export function setNewBlockDrag(dt: DataTransfer, type: string): void {
  dt.setData(NEW_BLOCK_MIME, type)
  dt.setData(`${TYPED_PREFIX}${type}`, type)
}

export function isNewBlockDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(NEW_BLOCK_MIME)
}

export function newBlockDragType(dt: DataTransfer): string | null {
  for (const t of Array.from(dt.types)) {
    if (t.startsWith(TYPED_PREFIX)) return t.slice(TYPED_PREFIX.length)
  }
  return null
}
