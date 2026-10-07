import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { inputSpotTpl } from '../lookup/inputSpot'
import { cellsClass } from './cells'
import { columnEditable } from './column'
import { columnStandsRight, type Column } from '../list/columns'
import {
  greyCellTpl,
  WITHOUT_DECORATION,
  type GreyPart,
  type RowDecoration,
  type RowLayout,
} from '../list/tableBody'
import type { CaptureLedger, RowState } from './ledger'

// The input a booked row's cell shows in place of its text.
function typingCellTpl(
  ledger: CaptureLedger,
  rawIndex: number,
  slot: number,
  column: Column,
): TemplateResult {
  return inputSpotTpl({
    value: ledger.cellValue(rawIndex, slot),
    title: column.title,
    placeholder: '',
    inputClass: cellsClass(ledger.isChanged(rawIndex, slot) ? 'changed' : 'quiet'),
    holderClass: 'cell-holder',
    marksOnEntering: true,
    slot,
    suggestions: [],
    columns: [],
    typed: '',
    mark: 0,
  }, {
    typing: (text) => ledger.typeCell(rawIndex, slot, text),
    key: (e) => ledger.keyCell(rawIndex, slot, e),
    leave: (text) => ledger.leaveCell(rawIndex, slot, text),
    chooseSuggestion: () => {},
    setMark: () => {},
  })
}

interface CapturedPlacement {
  columns: readonly Column[]
  slots: readonly number[]

  cols: Readonly<Record<string, string>>

  layout: RowLayout

  captured: readonly (readonly string[])[]

  capturedState: (index: number) => RowState

  correctionSlot: number | null

  capture: TemplateResult
}

interface CapturedAct {
  takeCapturedRow: (index: number) => void

  bringBackCapturedRow: (index: number) => void
}

// The grey line of a captured row: the value under each cell where one
// stands; null when no value stands there, and the row stays one line high.
function greyParts(layout: RowLayout, slots: readonly number[], values: readonly string[]): (GreyPart | null)[] | null {
  const parts = slots.map((slot): GreyPart | null => {
    const sub = layout.under.get(slot)
    const value = sub === undefined ? '' : values[sub.slot] ?? ''
    return sub === undefined || value === '' ? null : { column: sub.column, content: value, typable: false }
  })
  return parts.some((part) => part !== null) ? parts : null
}

export function capturedRowsTpl(placement: CapturedPlacement, act: CapturedAct): TemplateResult {
  return html`${placement.captured.map((values, rowsIndex) => {
    const state = placement.capturedState(rowsIndex)

    const fixed = state.status === 'written'
    const grey = greyParts(placement.layout, placement.slots, values)
    const cell = (column: Column, slot: number): TemplateResult => html`<div
      class=${columnStandsRight(column) ? 'right' : nothing}
      role="cell"
    >${values[slot] ?? ''}</div>`
    return html`${rowsIndex === placement.correctionSlot ? placement.capture : nothing}<div
      class="row captured${grey !== null ? ' subline' : ''}"
      role="row"
      data-status=${state.status}
      style=${styleMap(placement.cols)}
      @click=${fixed ? nothing : () => act.bringBackCapturedRow(rowsIndex)}
    >
      ${placement.columns.map((column, i) => cell(column, placement.slots[i]))}
      ${grey === null ? nothing : grey.map((part, i) => greyCellTpl(i, part))}
      <button
        class="row-remove"
        type="button"
        title=${fixed ? 'Aus der Ansicht nehmen' : 'Diese erfasste Zeile wieder wegnehmen'}
        aria-label="Erfasste Zeile wegnehmen"
        @click=${(e: MouseEvent) => {
          e.stopPropagation()
          act.takeCapturedRow(rowsIndex)
        }}
      >&#x2715;</button>
    </div>`
  })}${placement.correctionSlot === null || placement.correctionSlot >= placement.captured.length
    ? placement.capture
    : nothing}`
}

interface DecorationPlacement {
  typable: boolean

  ledger: CaptureLedger
}

export function captureDecoration(placement: DecorationPlacement): (rawIndex: number | null) => RowDecoration {
  return (rawIndex) => {
    if (rawIndex === null) return WITHOUT_DECORATION
    const state = placement.ledger.statusOf(rawIndex)
    return {
      ...WITHOUT_DECORATION,
      status: state.status === 'booked' ? '' : state.status,
      cell: (slot, column) => (placement.typable && columnEditable(column)
        ? typingCellTpl(placement.ledger, rawIndex, slot, column)
        : null),
    }
  }
}
