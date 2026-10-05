import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { inputSpotTpl } from '../lookup/inputSpot'
import { cellsClass } from './cells'
import { columnEditable } from './column'
import { columnStandsRight, type Column } from '../list/columns'
import { sublineTpl, WITHOUT_DECORATION, type RowDecoration, type RowLayout } from '../list/tableBody'
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

export function capturedRowsTpl(placement: CapturedPlacement, act: CapturedAct): TemplateResult {
  const layout = placement.layout
  return html`${placement.captured.map((values, rowsIndex) => {
    const state = placement.capturedState(rowsIndex)

    const fixed = state.status === 'written'
    const cell = (column: Column, slot: number): TemplateResult => {
      const value = values[slot] ?? ''
      const edge = columnStandsRight(column) ? 'right' : nothing
      if (!layout.hasSubs) return html`<div class=${edge} role="cell">${value}</div>`
      const subs = layout.subsOf(slot)
      return html`<div class=${edge} role="cell"><span class="line">${value}</span>${subs.columns.length === 0
        ? nothing
        : sublineTpl(subs.slots.map((s) => ({ content: values[s] ?? '', typable: false })))}</div>`
    }
    return html`${rowsIndex === placement.correctionSlot ? placement.capture : nothing}<div
      class="row captured${layout.hasSubs ? ' subline' : ''}"
      role="row"
      data-status=${state.status}
      style=${styleMap(placement.cols)}
      @click=${fixed ? nothing : () => act.bringBackCapturedRow(rowsIndex)}
    >
      ${placement.columns.map((column, i) => cell(column, placement.slots[i]))}
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
