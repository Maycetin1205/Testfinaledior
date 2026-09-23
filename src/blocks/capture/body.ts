import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { booleanProperty, type Property } from '../../core/block/property'
import { inputSpotTpl } from '../behavior/inputSpot'
import { cellsClass } from './cells'
import { columnEditable } from './column'
import { asNumber } from '../behavior/sorting'
import type { Column } from '../behavior/columns'
import { WITHOUT_DECORATION, type RowDecoration } from '../behavior/tableBody'
import type { CaptureLedger, RowsIcon } from './ledger'

function typingCellTpl(
  ledger: CaptureLedger,
  rawIndex: number,
  slot: number,
  column: Column,
): TemplateResult {
  const value = ledger.cellValue(rawIndex, slot)
  return html`<div
    class=${asNumber(value) !== null ? 'tippbar zahl' : 'typable'}
    role="cell"
  >${inputSpotTpl({
    value,
    title: column.title,
    placeholder: '',
    klasse: cellsClass(ledger.isChanged(rawIndex, slot) ? 'changed' : 'quiet'),
    holderClass: 'zell-halter',
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
    attribute: 'deletable',
    needsSource: true,
  })
}

function deleteCrossTpl(deleted: boolean, toggle: () => void): TemplateResult {
  return html`<button
    class="zeile-weg"
    type="button"
    title=${deleted ? 'Löschen zurücknehmen' : 'Diese Position zum Löschen vormerken'}
    aria-label=${deleted ? 'Löschen zurücknehmen' : 'Position zum Löschen vormerken'}
    @click=${(e: MouseEvent) => { e.stopPropagation(); toggle() }}
  >${deleted ? '\u21BA' : '\u2715'}</button>`
}

function crossDisplayTpl(): TemplateResult {
  return html`<span class="zeile-weg zeile-weg-anzeige">&#x2715;</span>`
}

export interface CapturedPlacement {
  columns: readonly Column[]
  slots: readonly number[]

  cols: Readonly<Record<string, string>>

  inEditor: boolean

  captured: readonly (readonly string[])[]

  capturedState: (index: number) => RowsIcon

  correctionSlot: number | null

  capture: TemplateResult
}

export interface CapturedAct {
  takeCapturedRow: (index: number) => void

  holeCapturedRow: (index: number) => void
}

export function capturedRowsTpl(placement: CapturedPlacement, tun: CapturedAct): TemplateResult {
  return html`${placement.captured.map((values, rowsIndex) => {
    const icon = placement.capturedState(rowsIndex)

    const fixed = icon.status === 'written'
    return html`${rowsIndex === placement.correctionSlot ? placement.capture : nothing}<div
      class="zeile erfasst"
      role="row"
      data-status=${icon.status}
      style=${styleMap(placement.cols)}
      @click=${placement.inEditor || fixed ? nothing : () => tun.holeCapturedRow(rowsIndex)}
    >
      ${placement.columns.map((_s, i) => {
        const value = values[placement.slots[i]] ?? ''
        return html`<div class=${asNumber(value) !== null ? 'number' : nothing} role="cell">${value}</div>`
      })}
      ${placement.inEditor ? nothing : html`<button
          class="zeile-weg"
          type="button"
          title=${fixed ? 'Aus der Ansicht nehmen' : 'Diese erfasste Zeile wieder wegnehmen'}
          aria-label="Erfasste Zeile wegnehmen"
          @click=${(e: MouseEvent) => {
            e.stopPropagation()
            tun.takeCapturedRow(rowsIndex)
          }}
        >&#x2715;</button>`}
    </div>`
  })}${placement.correctionSlot === null || placement.correctionSlot >= placement.captured.length
    ? placement.capture
    : nothing}`
}

export interface DecorationPlacement {
  inEditor: boolean

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
        right: placement.deletable && placement.inEditor ? crossDisplayTpl() : nothing,
      }
    }
    const icon = placement.ledger.statusOf(rawIndex)
    const deleted = placement.ledger.isDeleted(rawIndex)
    return {
      status: icon.status === 'booked' ? '' : icon.status,
      klasse: deleted ? 'deleted' : '',
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
