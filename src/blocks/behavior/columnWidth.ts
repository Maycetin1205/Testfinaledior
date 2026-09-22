import { html, type TemplateResult } from 'lit'
import { COLUMNS_MIN_WIDTH, type Column } from './columns'

export interface WidthsChange {
  index: number
  width: number
}

export interface WidthsHost {
  show: (change: readonly WidthsChange[]) => void

  adopt: (change: readonly WidthsChange[]) => void

  discard: () => void
}

export function spreadDrag(
  leftStart: number,
  rightStart: number,
  wishDx: number,
): { left: number; right: number } {
  const bottomDx = COLUMNS_MIN_WIDTH - leftStart
  const topDx = rightStart - COLUMNS_MIN_WIDTH
  const dx = bottomDx > topDx ? 0 : Math.min(topDx, Math.max(bottomDx, Math.round(wishDx)))
  return { left: Math.round(leftStart + dx), right: Math.round(rightStart - dx) }
}

function startDrag(e: PointerEvent, index: number, host: WidthsHost): void {
  if (e.button !== 0) return
  const head = (e.currentTarget as HTMLElement | null)?.parentElement
  const cells = [...(head?.children ?? [])]
    .filter((k): k is HTMLElement => k instanceof HTMLElement && k.tagName === 'DIV')
  const left = cells[index]
  const right = cells[index + 1]
  if (!left || !right) return

  e.stopPropagation()
  e.preventDefault()

  const startX = e.clientX
  const leftStart = left.getBoundingClientRect().width
  const rightStart = right.getBoundingClientRect().width
  let last = spreadDrag(leftStart, rightStart, 0)

  const cleanUp = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onRelease)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('blur', onCancel)
  }

  const measured = cells.map((k) => Math.max(1, Math.round(k.getBoundingClientRect().width)))

  const asPair = (): WidthsChange[] => measured.map((width, i) => {
    if (i === index) return { index: i, width: last.left }
    if (i === index + 1) return { index: i, width: last.right }
    return { index: i, width }
  })

  function onMove(ev: PointerEvent): void {
    last = spreadDrag(leftStart, rightStart, ev.clientX - startX)
    host.show(asPair())
  }

  function onRelease(): void {
    cleanUp()
    host.adopt(asPair())
  }

  function onCancel(): void {
    cleanUp()
    host.discard()
  }

  function onKey(ev: KeyboardEvent): void {
    if (ev.key !== 'Escape') return
    ev.preventDefault()
    onCancel()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onRelease)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
  window.addEventListener('blur', onCancel)
}

export function widthsHandles(
  columnsCount: number,
  host: WidthsHost,
): TemplateResult[] {
  return Array.from({ length: Math.max(0, columnsCount - 1) }, (_, i) => html`<span
    class="breite-griff"
    role="presentation"
    style="grid-row: 1; grid-column: ${i + 1}"
    title="Linie ziehen: links breiter, rechts schmaler"
    @pointerdown=${(e: PointerEvent) => startDrag(e, i, host)}
    @click=${(e: MouseEvent) => e.stopPropagation()}
    @dblclick=${(e: MouseEvent) => e.stopPropagation()}
  ></span>`)
}

export interface WidthsStateHost {
  inEditor: () => boolean

  fullSlot: (rendered: number) => number

  columnsList: () => Column[]

  writeColumns: (columns: Column[]) => void

  report: () => void
}

export class WidthsState {
  private readonly host: WidthsStateHost

  private readonly _widths = new Map<number, number>()

  private _beforeDrag: Map<number, number | undefined> | null = null

  constructor(host: WidthsStateHost) {
    this.host = host
  }

  widthOf(index: number): number | undefined {
    return this._widths.get(index)
  }

  forget(): void {
    this._widths.clear()
  }

  private full(change: readonly WidthsChange[]): WidthsChange[] {
    return change.map((a) => ({ index: this.host.fullSlot(a.index), width: a.width }))
  }

  hostForDrag(): WidthsHost {
    return {
      show: (raw) => {
        const change = this.full(raw)
        if (this._beforeDrag === null) {
          this._beforeDrag = new Map(change.map((a) => [a.index, this._widths.get(a.index)]))
        }
        for (const a of change) this._widths.set(a.index, a.width)
        this.host.report()
      },
      adopt: (raw) => {
        const change = this.full(raw)
        this._beforeDrag = null
        if (!this.host.inEditor()) {
          for (const a of change) this._widths.set(a.index, a.width)
          this.host.report()
          return
        }

        const list = this.host.columnsList()
        for (const a of change) {
          if (a.index >= list.length) continue
          this._widths.delete(a.index)
          list[a.index] = { ...list[a.index], width: a.width }
        }
        this.host.writeColumns(list)
      },
      discard: () => {
        const before = this._beforeDrag
        this._beforeDrag = null
        if (!before) return
        for (const [index, value] of before) {
          if (value === undefined) this._widths.delete(index)
          else this._widths.set(index, value)
        }
        this.host.report()
      },
    }
  }
}
