// Where a bar and its window stand on the screen: beside the block, clear of
// other blocks and of the edge.

interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

// Clear of the selection outline and the grips on the edge.
export const GAP = 4

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

// The room of the bar: the canvas, and above it the grey up to the edge, so a
// block in the first row keeps its bar above as well.
function roomOf(el: HTMLElement): Box {
  const canvas = el.closest('[data-ff-canvas]')
  if (!canvas) return { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
  const c = canvas.getBoundingClientRect()
  const main = el.closest('main')
  return { top: main ? main.getBoundingClientRect().top : c.top, bottom: c.bottom, left: c.left, right: c.right }
}

// Every other block: not the block itself, not what holds it, not what it holds.
function otherBlocks(el: HTMLElement): Box[] {
  return [...document.querySelectorAll<HTMLElement>('[data-block-id]')]
    .filter((b) => b !== el && !b.contains(el) && !el.contains(b))
    .map((b) => b.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
}

// How far below the top edge the head of the block ends, like a table's row
// of column heads.
export function headDepth(el: HTMLElement, element: HTMLElement | null, head: string | undefined): number {
  const part = head ? element?.shadowRoot?.querySelector(head) : null
  return part ? Math.max(0, part.getBoundingClientRect().bottom - el.getBoundingClientRect().top) : 0
}

// Where no other block and no edge is in the way, flush with the block's left
// edge or with its column. A table, a board, a capture: above its top edge,
// else above it just past what stands in the way, else inside below its
// column heads. A low block like a field never lies under its own bar: above
// it, else below it, else beside it on the right or the left, else above it
// over its neighbour.
export function spotFor(bar: HTMLElement, el: HTMLElement, depth: number, align?: number): { top: number; left: number } {
  const room = roomOf(el)
  bar.style.maxWidth = `${Math.max(0, room.right - room.left)}px`
  const w = bar.offsetWidth
  const h = bar.offsetHeight
  const r = el.getBoundingClientRect()
  const others = otherBlocks(el)
  const inRoom = (left: number) => Math.max(room.left, Math.min(left, room.right - w))
  const left = inRoom(align ?? r.left)
  const free = (top: number, at = left) => {
    const box = { top, bottom: top + h, left: at, right: at + w }
    return box.top >= room.top && box.bottom <= room.bottom && !others.some((o) => overlaps(box, o))
      && (at === left || !overlaps(box, r))
  }
  const above = r.top - GAP - h
  if (free(above)) return { top: above, left }
  const low = align === undefined && r.height <= 3 * h
  if (!low) {
    // Above the block, just past what is in the way, not at its far end.
    const past = align === undefined
      ? others
          .filter((o) => o.top < above + h && o.bottom > above)
          .map((o) => inRoom(o.right + GAP))
          .filter((x) => x > left && x < r.right)
          .sort((a, b) => a - b)
          .find((x) => free(above, x))
      : undefined
    return past === undefined ? { top: r.top + depth, left } : { top: above, left: past }
  }
  const below = r.bottom + GAP
  if (free(below)) return { top: below, left }
  const middle = r.top + (r.height - h) / 2
  const right = r.right + GAP
  if (right + w <= room.right && free(middle, right)) return { top: middle, left: right }
  const leftOf = r.left - GAP - w
  if (leftOf >= room.left && free(middle, leftOf)) return { top: middle, left: leftOf }
  return { top: Math.max(room.top, above), left }
}

// Beside the block and its bar, at the block's top: on the right, else on the
// left; where neither has room, as beside a table, below the button that
// opens it.
export function besideOf(
  block: HTMLElement | null | undefined,
  button: HTMLElement | null,
  width: number,
): { top: number; left: number } | undefined {
  if (!block) return undefined
  const r = block.getBoundingClientRect()
  const bar = button?.closest('[data-ff-editor-helper]')?.getBoundingClientRect()
  const right = Math.max(r.right, bar?.right ?? r.right)
  const left = Math.min(r.left, bar?.left ?? r.left)
  if (right + GAP + width <= window.innerWidth - GAP) return { top: r.top, left: right + GAP }
  if (left - GAP - width >= GAP) return { top: r.top, left: left - GAP - width }
  return undefined
}
