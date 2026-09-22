import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { inputSpotTpl, cellsClass } from './cellInput'
import { columnEditable } from './captureColumn'
import { asNumber } from './sorting'
import type { Column } from './columns'
import { WITHOUT_DECORATION, type RowDecoration } from './tableBody'
import type { RowsEditing } from './rowEditing'
import type { RowsIcon } from './rowStatus'

export function typingCellTpl(
  state: RowsEditing,
  rawIndex: number,
  slot: number,
  column: Column,
): TemplateResult {
  const value = state.cellValue(rawIndex, slot)
  return html`<div
    class=${asNumber(value) !== null ? 'tippbar zahl' : 'typable'}
    role="cell"
  >${inputSpotTpl({
    value,
    title: column.title,
    placeholder: '',
    klasse: cellsClass(state.isChanged(rawIndex, slot) ? 'changed' : 'quiet'),
    holderClass: 'zell-halter',
    slot,
    suggestions: [],
    mark: 0,
  }, {
    typing: (text) => state.typeCell(rawIndex, slot, text),
    key: (e) => state.keyCell(rawIndex, slot, e),
    leave: (text) => state.leaveCell(rawIndex, slot, text),
    chooseSuggestion: () => {},
    setMark: () => {},
  })}</div>`
}

export function deleteCrossTpl(deleted: boolean, toggle: () => void): TemplateResult {
  return html`<button
    class="zeile-weg"
    type="button"
    title=${deleted ? 'Löschen zurücknehmen' : 'Diese Position zum Löschen vormerken'}
    aria-label=${deleted ? 'Löschen zurücknehmen' : 'Position zum Löschen vormerken'}
    @click=${(e: MouseEvent) => { e.stopPropagation(); toggle() }}
  >${deleted ? '\u21BA' : '\u2715'}</button>`
}

export function crossDisplayTpl(): TemplateResult {
  return html`<span
    class="zeile-weg zeile-weg-anzeige"
    title="Zeilen l\u00F6schbar \u2014 in der Maske per Kreuz oder Entf-Taste"
  >&#x2715;</span>`
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
      title=${placement.inEditor || fixed ? icon.title : `${icon.title} — zum Korrigieren anklicken`}
      style=${styleMap(placement.cols)}
      @click=${placement.inEditor || fixed ? nothing : () => tun.holeCapturedRow(rowsIndex)}
    >
      ${placement.columns.map((_s, i) => {
        const value = values[placement.slots[i]] ?? ''
        const missingText = i === 0 && icon.status === 'error'
          ? html`<span class="fehltext">${icon.title}</span>`
          : nothing
        return html`<div class=${asNumber(value) !== null ? 'number' : nothing} role="cell">${value}${missingText}</div>`
      })}
      ${placement.inEditor ? nothing : html`<button
          class="zeile-weg"
          type="button"
          title=${fixed
            ? 'Aus der Ansicht nehmen — geschrieben ist sie schon'
            : 'Diese erfasste Zeile wieder wegnehmen'}
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

  rows: RowsEditing
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
    const icon = placement.rows.statusOf(rawIndex)
    const deleted = placement.rows.isDeleted(rawIndex)
    return {
      status: icon.status === 'booked' ? '' : icon.status,
      title: icon.title,
      klasse: deleted ? 'deleted' : '',
      missingText: icon.status === 'error' ? icon.title : '',
      cell: (slot, column) => (placement.typable && columnEditable(column)
        ? typingCellTpl(placement.rows, rawIndex, slot, column)
        : null),
      right: cross
        ? deleteCrossTpl(deleted, () => placement.rows.toggleDeletion(rawIndex))
        : nothing,
      key: (e) => {
        if (e.key !== 'Delete' || !cross) return false
        placement.rows.toggleDeletion(rawIndex)
        return true
      },
    }
  }
}
