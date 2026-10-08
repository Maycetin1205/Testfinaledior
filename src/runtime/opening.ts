import { openedByProperty } from '../core/block/opening'
import { BLOCK_ID_ATTR } from '../core/data/actions'

// A block that opens an area says so with this event; the area that names it
// opens, or closes again.
const OPEN_EVENT = 'ff-open'

export function sendOpen(el: HTMLElement): void {
  el.dispatchEvent(new CustomEvent(OPEN_EVENT, { bubbles: true, composed: true }))
}

function blockWithId(doc: Document, id: string): Element | undefined {
  return Array.from(doc.querySelectorAll(`[${BLOCK_ID_ATTR}]`))
    .find((el) => el.getAttribute(BLOCK_ID_ATTR) === id)
}

// Whether an area of the mask opens with this block.
export function opensAnArea(el: HTMLElement): boolean {
  const id = el.getAttribute(BLOCK_ID_ATTR)
  if (id === null) return false
  return Array.from(el.ownerDocument.querySelectorAll(`[${openedByProperty.attribute}]`))
    .some((area) => area.getAttribute(openedByProperty.attribute) === id)
}

interface Rows {
  y: number
  h: number
}

// The rows a block takes as the export placed it, read before anything moved.
const placed = new WeakMap<Element, Rows>()

function rowsOf(el: HTMLElement): Rows | null {
  const known = placed.get(el)
  if (known) return known
  const start = Number(el.style.gridRowStart)
  const span = /^span (\d+)$/.exec(el.style.gridRowEnd.trim())
  if (!Number.isInteger(start) || start < 1 || !span) return null
  const rows = { y: start - 1, h: Number(span[1]) }
  placed.set(el, rows)
  return rows
}

// The rows of a closed area fall away, and with them the free rows right
// below it; what lies below moves up by as many rows. A row that a shown block
// takes stays.
function flowRows(parent: Element | null): void {
  if (!parent) return
  const blocks = Array.from(parent.children)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .flatMap((el) => {
      const rows = rowsOf(el)
      return rows ? [{ el, rows }] : []
    })
  const end = blocks.reduce((max, b) => Math.max(max, b.rows.y + b.rows.h), 0)
  const shown = Array.from({ length: end }, () => false)
  const closed = Array.from({ length: end }, () => false)
  for (const { el, rows } of blocks) {
    for (let r = rows.y; r < rows.y + rows.h; r++) (el.hidden ? closed : shown)[r] = true
  }
  // How many rows fell away up to each row.
  const goneUpTo: number[] = []
  let falls = false
  for (let r = 0, count = 0; r < end; r++) {
    falls = !shown[r] && (closed[r] || falls)
    if (falls) count++
    goneUpTo.push(count)
  }
  for (const { el, rows } of blocks) {
    if (el.hidden) continue
    const up = rows.y === 0 ? 0 : goneUpTo[rows.y - 1]
    el.style.gridRowStart = String(rows.y - up + 1)
  }
}

// An area that names a block of the mask is closed until that block is
// clicked; each click opens or closes it. Without that block it stays open.
export function wireOpened(area: HTMLElement, openerId: string): () => void {
  const doc = area.ownerDocument
  const opener = openerId === '' ? undefined : blockWithId(doc, openerId)
  if (!opener) return () => {}
  area.hidden = true
  flowRows(area.parentElement)
  const toggle = (e: Event): void => {
    if (e.target !== opener) return
    area.hidden = !area.hidden
    flowRows(area.parentElement)
  }
  doc.addEventListener(OPEN_EVENT, toggle)
  return () => doc.removeEventListener(OPEN_EVENT, toggle)
}
