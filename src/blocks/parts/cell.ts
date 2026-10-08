import { html, nothing, type TemplateResult } from 'lit'
import { columnStandsRight, type Column, type ColumnView } from './column'

// The cell: where it stands in a row and in the grey line under it, how Tab
// and the arrows walk from one to the next, and the cell of the grey line.

// The columns of the row, and under a cell of it the column of the grey line
// standing there, both by their place among all columns.
export interface RowLayout {
  main: ColumnView

  under: ReadonlyMap<number, { column: Column; slot: number }>
}

// The cells Tab walks: the row from left to right, then its grey line.
export function walkOrder(layout: RowLayout): number[] {
  const grey = layout.main.slots.flatMap((slot) => {
    const sub = layout.under.get(slot)
    return sub === undefined ? [] : [sub.slot]
  })
  return [...layout.main.slots, ...grey]
}

// The cell of the grey line under a cell of the row; -1 where none stands.
export function cellBelow(layout: RowLayout, slot: number): number {
  return layout.under.get(slot)?.slot ?? -1
}

// The cell of the row over a cell of the grey line; -1 for a cell of the row.
export function cellAbove(layout: RowLayout, slot: number): number {
  return [...layout.under].find(([, sub]) => sub.slot === slot)?.[0] ?? -1
}

// The cells over each other at the place of a cell: that of the row, then
// that of the grey line under it.
export function stripeOf(layout: RowLayout, slot: number): number[] {
  const above = cellAbove(layout, slot)
  const top = above === -1 ? slot : above
  const below = cellBelow(layout, top)
  return below === -1 ? [top] : [top, below]
}

// What a cell of the grey line shows: its value as text, or the input of a
// typable cell.
export interface GreyPart {
  column: Column

  content: TemplateResult | string

  typable: boolean
}

// A cell of the grey line, under the cell of the row at the same place: the
// name of its column, small and grey, before the value. Without a part the
// cell stays empty and only carries the column line. In the editor a spot
// names the column, and the cell is its head.
export function greyCellTpl(at: number, part: GreyPart | null, spot?: number): TemplateResult {
  const classes = [
    'sub',
    part !== null && columnStandsRight(part.column) ? 'right' : '',
    part?.column.hidden === true ? 'hidden' : '',
    part?.typable === true ? 'typable' : '',
  ].filter((k) => k !== '').join(' ')
  return html`<div
    class=${classes}
    role="cell"
    style="grid-column: ${at + 1}"
    data-ff-entry=${spot ?? nothing}
    data-ff-below=${spot === undefined ? nothing : ''}
    data-ff-editable=${spot === undefined ? nothing : ''}
  >${part === null ? nothing : html`<span class="head-text">${part.column.title}</span>${part.typable
    ? part.content
    : part.content === '' ? nothing : html`<span class="sub-value">${part.content}</span>`}`}</div>`
}
