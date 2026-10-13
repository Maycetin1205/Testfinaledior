import type { TemplateResult } from 'lit'
import { readDeclared } from '../../core/block/registry'
import { openLookup } from '../lookup/lookup'
import { keyOf } from '../lookup/suggestionState'
import type { ColumnView } from '../parts/column'
import type { RowLayout } from '../parts/cell'
import type { CaptureColumn } from './column'
import type { CaptureLedger } from './ledger'
import { captureProperties } from './properties'
import { captureRowTpl } from './row'

// The lookup window draws its rows with the table block.
import '../table/Table'

// Where the capture row is drawn and how big its lookup window opens. The
// ledger answers everything else.
interface CaptureRowPlacement {
  ledger: CaptureLedger

  block: HTMLElement

  preview: boolean

  sourceId: string

  windowWidth: number

  windowHeight: number
}

function openWindow(placement: CaptureRowPlacement, index: number): void {
  const spot = placement.ledger.lookupAt(index)
  if (spot === null) return
  openLookup({
    el: placement.block,
    spot: spot.spot,
    sourceId: spot.sourceId,
    storageField: spot.field,
    storageTitle: spot.title,
    columns: spot.columns,
    title: spot.title,
    width: placement.windowWidth,
    height: placement.windowHeight,
    entries: spot.entries,

    backFocus: () => placement.ledger.focusCell(index),
    searchText: spot.searchText,
    onAdopt: (_display, _value, record) => {
      placement.ledger.adopt(index, record)
      placement.ledger.jumpFrom(index, 'Enter')
    },
  })
}

function key(placement: CaptureRowPlacement, index: number, e: KeyboardEvent): void {
  const ledger = placement.ledger
  if (e.key === 'F5') e.preventDefault()

  if (e.key === 'Tab' && e.shiftKey) {
    const previous = ledger.neighbour(index, -1)
    if (previous === -1) return
    e.preventDefault()
    ledger.focusCell(previous)
    return
  }
  const action = ledger.decideKey(index, keyOf(e))
  if (action === 'nothing') {
    if (e.key === 'Enter') e.preventDefault()
    return
  }
  let keep = true
  if (action === 'adopt') {
    ledger.adoptSuggestion(index, ledger.mark)
    // Enter takes the hit and stays in the cell; Tab goes on.
    if (e.key === 'Tab') keep = ledger.jumpFrom(index, e.key)
  } else if (action === 'window') openWindow(placement, index)
  else if (action === 'further') keep = ledger.jumpFrom(index, e.key)
  else if (action === 'down') keep = ledger.down(index)
  else if (action === 'up') keep = ledger.up(index)
  else if (action === 'clear') ledger.empty(index)
  else if (action === 'giveUp') keep = ledger.giveUp()
  if (keep) e.preventDefault()
}

// The quiet words in the empty cells of the row being typed: the title of a
// required column, the hint of the block in the first column that is not.
function placeholders(block: HTMLElement, view: ColumnView): (slot: number) => string {
  const hint = readDeclared(block, captureProperties.rowHint) ?? ''
  const required = (i: number): boolean => (view.columns[i] as CaptureColumn).required === true
  const hintAt = view.slots.find((_, i) => !required(i))
  return (slot) => {
    const i = view.slots.indexOf(slot)
    if (i !== -1 && required(i)) return view.columns[i].title
    return slot === hintAt ? hint : ''
  }
}

export function captureRowFor(
  placement: CaptureRowPlacement,
  view: ColumnView,
  cols: Readonly<Record<string, string>>,
  layout: RowLayout,
  listToTop: boolean,
): TemplateResult {
  const ledger = placement.ledger
  const cells = ledger.rowView()
  return captureRowTpl({
    columns: view.columns,
    slots: view.slots,
    layout,
    sourceId: placement.sourceId,
    cols,
    preview: placement.preview,
    value: (i) => cells[i]?.value ?? '',
    automatic: (i) => cells[i]?.automatic === true,
    typingColumn: ledger.typingColumn,
    suggestions: ledger.suggestions,
    mark: ledger.mark,
    typed: (i) => ledger.typedAt(i),
    windowColumns: (i) => ledger.windowColumnsAt(i),
    placeholder: placement.preview ? () => '' : placeholders(placement.block, view),
    listToTop,
  }, {
    typing: (i, text) => ledger.type(i, text),
    key: (i, e) => key(placement, i, e),
    leave: (i) => ledger.leave(i),
    chooseSuggestion: (listIndex) => ledger.adoptSuggestion(ledger.typingColumn, listIndex),
    setMark: (listIndex) => ledger.setMark(listIndex),
  })
}
