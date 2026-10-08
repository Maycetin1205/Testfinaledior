import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { entryPathFrom, type EntryPath } from '../../core/block/listBinding'
import { startRename } from './inlineRename'

// In the editor a block with heads, like the columns of a table or a board,
// reports where they stand: after each drawing and whenever it changes size.
// The editor lays its handles over them and measures nothing itself. A head
// names its entry in data-ff-entry, a cell that names a sibling in
// data-ff-place. The event stays at the element.
export const HEADS_PLACED = 'ff-heads-placed'

// In pixels from the block's top left corner.
export interface Frame {
  left: number
  top: number
  width: number
  height: number
}

export interface HeadPlace extends Frame {
  path: EntryPath

  // The head stands in a second line, like a column of the grey line.
  below: boolean

  // Typing the title on the head itself.
  rename: (done: (typed: string, original: string) => void) => void
}

// A cell that names a sibling by its key, like the cell a column of the grey
// line stands under.
export interface CellPlace extends Frame {
  key: string
}

export interface HeadsPlaced {
  heads: readonly HeadPlace[]
  places: readonly CellPlace[]
}

export const NO_HEADS: HeadsPlaced = { heads: [], places: [] }

const lastReport = new WeakMap<HTMLElement, HeadsPlaced>()

// What the block reported last: a listener that comes later starts from here.
export function headsPlacedOf(el: HTMLElement): HeadsPlaced {
  return lastReport.get(el) ?? NO_HEADS
}

interface HeadsHost extends ReactiveControllerHost, HTMLElement {
  readonly preview: boolean
}

class HeadsReport implements ReactiveController {
  private readonly host: HeadsHost

  private resized: ResizeObserver | null = null

  constructor(host: HeadsHost) {
    this.host = host
    host.addController(this)
  }

  hostConnected(): void {
    if (!this.host.preview) return
    this.resized = new ResizeObserver(() => this.report())
    this.resized.observe(this.host)
  }

  hostUpdated(): void {
    if (this.host.preview) this.report()
  }

  hostDisconnected(): void {
    this.resized?.disconnect()
    this.resized = null
  }

  private report(): void {
    const host = this.host
    const root = host.shadowRoot
    if (!root) return
    const origin = host.getBoundingClientRect()
    const frameOf = (el: HTMLElement): Frame => {
      const r = el.getBoundingClientRect()
      return { left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height }
    }
    const placed: HeadsPlaced = {
      heads: Array.from(root.querySelectorAll<HTMLElement>('[data-ff-entry]'), (el, i) => ({
        ...frameOf(el),
        path: entryPathFrom(el.getAttribute('data-ff-entry'), i),
        below: el.hasAttribute('data-ff-below'),
        rename: (done) => startRename(el.querySelector<HTMLElement>('.head-text') ?? el, done),
      })),
      places: Array.from(root.querySelectorAll<HTMLElement>('[data-ff-place]'), (el) => ({
        ...frameOf(el),
        key: el.getAttribute('data-ff-place') ?? '',
      })),
    }
    lastReport.set(host, placed)
    host.dispatchEvent(new CustomEvent<HeadsPlaced>(HEADS_PLACED, { detail: placed }))
  }
}

export function reportsHeads(host: HeadsHost): void {
  new HeadsReport(host)
}
