import type { TemplateResult } from 'lit'
import { openLookup } from '../behavior/lookup'
import { keyOf } from '../behavior/suggestionState'
import type { ColumnView } from '../behavior/columns'
import type { CaptureLedger } from './ledger'
import { captureRowTpl } from './row'

// The lookup window draws its rows with the table block.
import '../table/Table'

// Where the capture row is drawn and how big its lookup window opens. The
// ledger answers everything else.
export interface CaptureRowPlacement {
  ledger: CaptureLedger

  block: HTMLElement

  inEditor: boolean

  titleInCell: boolean

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
    keep = ledger.jumpFrom(index, e.key)
  } else if (action === 'window') openWindow(placement, index)
  else if (action === 'openList') ledger.openList(index)
  else if (action === 'further') keep = ledger.jumpFrom(index, e.key)
  else if (action === 'clear') ledger.empty(index)
  if (keep) e.preventDefault()
}

export function captureRowFor(
  placement: CaptureRowPlacement,
  cols: Readonly<Record<string, string>>,
  listToTop: boolean,

  view: ColumnView,
): TemplateResult {
  const ledger = placement.ledger
  const cells = placement.inEditor ? [] : ledger.rowView()
  return captureRowTpl({
    columns: view.columns,
    slots: view.slots,
    sourceId: placement.sourceId,
    cols,
    titleInCell: placement.titleInCell,
    inEditor: placement.inEditor,
    value: (i) => cells[i]?.value ?? '',
    automatic: (i) => cells[i]?.automatic === true,
    typingColumn: ledger.typingColumn,
    suggestions: ledger.suggestions,
    mark: ledger.mark,
    listToTop,
  }, {
    typing: (i, text) => ledger.type(i, text),
    key: (i, e) => key(placement, i, e),
    leave: (i) => ledger.leave(i),
    chooseSuggestion: (listIndex) => ledger.adoptSuggestion(ledger.typingColumn, listIndex),
    setMark: (listIndex) => ledger.setMark(listIndex),
  })
}
