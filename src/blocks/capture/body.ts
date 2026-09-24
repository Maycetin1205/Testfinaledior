import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { booleanProperty, type Property } from '../../core/block/property'
import { inputSpotTpl } from '../lookup/inputSpot'
import { cellsClass } from './cells'
import { columnEditable } from './column'
import { asNumber } from '../list/sorting'
import type { Column } from '../list/columns'
import { WITHOUT_DECORATION, type RowDecoration } from '../list/tableBody'
import type { CaptureLedger, RowState } from './ledger'

function typingCellTpl(
  ledger: CaptureLedger,
  rawIndex: number,
  slot: number,
  column: Column,
): TemplateResult {
  const value = ledger.cellValue(rawIndex, slot)
  return html`<div
    class=${asNumber(value) !== null ? 'typable number' : 'typable'}
    role="cell"
  >${inputSpotTpl({
    value,
    title: column.title,
    placeholder: '',
    inputClass: cellsClass(ledger.isChanged(rawIndex, slot) ? 'changed' : 'quiet'),
    holderClass: 'cell-holder',
    slot,
    suggestions: [],
    mark: 0,
  }, {
    typing: (text) => ledger.typeCell(rawIndex, slot, text),
    key: (e) => ledger.keyCell(rawIndex, slot, e),
    leave: (text) => ledger.leaveCell(rawIndex, slot, text),
    chooseSuggestion: () => {},
    setMark: () => {},
  })}</div>`
}

export function deletableProperty(): Property<boolean> {
  return booleanProperty({
    default: false,
    label: 'Zeilen löschbar',
    place: 'display',
    attribute: 'deletable',
    needsSource: true,
  })
}

function deleteCrossTpl(deleted: boolean, toggle: () => void): TemplateResult {
  return html`<button
    class="row-remove"
    type="button"
    title=${deleted ? 'Löschen zurücknehmen' : 'Diese Position zum Löschen vormerken'}
    aria-label=${deleted ? 'Löschen zurücknehmen' : 'Position zum Löschen vormerken'}
    @click=${(e: MouseEvent) => { e.stopPropagation(); toggle() }}
  >${deleted ? '\u21BA' : '\u2715'}</button>`
}

function crossDisplayTpl(): TemplateResult {
  return html`<span class="row-remove row-remove-static">&#x2715;</span>`
}

interface CapturedPlacement {
  columns: readonly Column[]
  slots: readonly number[]

  cols: Readonly<Record<string, string>>

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
  return html`${placement.captured.map((values, rowsIndex) => {
    const state = placement.capturedState(rowsIndex)

    const fixed = state.status === 'written'
    return html`${rowsIndex === placement.correctionSlot ? placement.capture : nothing}<div
      class="row captured"
      role="row"
      data-status=${state.status}
      style=${styleMap(placement.cols)}
      @click=${fixed ? nothing : () => act.bringBackCapturedRow(rowsIndex)}
    >
      ${placement.columns.map((_s, i) => {
        const value = values[placement.slots[i]] ?? ''
        return html`<div class=${asNumber(value) !== null ? 'number' : nothing} role="cell">${value}</div>`
      })}
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
  preview: boolean

  deletable: boolean

  typable: boolean

  ledger: CaptureLedger
}

export function captureDecoration(placement: DecorationPlacement): (rawIndex: number | null) => RowDecoration {
  const cross = placement.deletable && placement.typable
  return (rawIndex) => {
    if (rawIndex === null) {
      return {
        ...WITHOUT_DECORATION,
        right: placement.deletable && placement.preview ? crossDisplayTpl() : nothing,
      }
    }
    const state = placement.ledger.statusOf(rawIndex)
    const deleted = placement.ledger.isDeleted(rawIndex)
    return {
      status: state.status === 'booked' ? '' : state.status,
      className: deleted ? 'deleted' : '',
      cell: (slot, column) => (placement.typable && columnEditable(column)
        ? typingCellTpl(placement.ledger, rawIndex, slot, column)
        : null),
      right: cross
        ? deleteCrossTpl(deleted, () => placement.ledger.toggleDeletion(rawIndex))
        : nothing,
      key: (e) => {
        if (e.key !== 'Delete' || !cross) return false
        placement.ledger.toggleDeletion(rawIndex)
        return true
      },
    }
  }
}
