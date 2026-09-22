import { bindingAttr } from '../../core/block/capability'
import { recordIndexOf, fieldWrite } from '../../softengine/data'
import { runtimeSource, rowsTheSource } from '../../softengine/runtimeSources'
import { giverIdOf, plainSelection, rowsToSelection, setSelection } from '../behavior/selection'
import { makeDataLink, sourceIdOf } from '../behavior/source'
import { readBoundSpot } from '../behavior/boundSpot'
import { reportChainsError, runEvent } from '../behavior/events'

// What the last read found. The field says this out loud instead of standing
// there empty without a word.
export type ValueReport =
  | { kind: 'notRead' }
  | { kind: 'sourceMissing' }
  | { kind: 'withoutRecords'; sourceName: string }
  | { kind: 'withoutChoice' }
  | { kind: 'withoutFitting'; sourceName: string }
  | { kind: 'read' }

export const NOT_READ: ValueReport = { kind: 'notRead' }

export interface ValueElement extends HTMLElement {
  value: string

  valueReport: ValueReport

  fillsSelf?: () => boolean

  checkOwnValue?: () => void
}

interface Connected {
  row: unknown
  code: string
  pindex: string
}

const data = new WeakMap<ValueElement, Connected>()
const wired = new WeakSet<ValueElement>()

function currentValue(el: ValueElement): string {
  return typeof el.value === 'string' ? el.value : ''
}

// Why no record reached the field: the source delivered none, nothing is
// chosen yet, or nothing chosen fits.
function withoutRowReport(el: ValueElement): ValueReport {
  const source = runtimeSource(sourceIdOf(el))
  if (!source) return { kind: 'sourceMissing' }
  const delivered = rowsTheSource(source)
  if (delivered.length === 0) return { kind: 'withoutRecords', sourceName: source.name }
  const { rows, filtered } = rowsToSelection(el, delivered)
  if (filtered && rows.length === 0) return { kind: 'withoutFitting', sourceName: source.name }
  return { kind: 'withoutChoice' }
}

function hydrate(el: ValueElement): void {
  el.checkOwnValue?.()
  if (el.fillsSelf?.() === true) {
    data.delete(el)
    el.valueReport = { kind: 'read' }
    return
  }

  const spot = readBoundSpot(el, bindingAttr('value'))
  if (spot.kind !== 'value') {
    data.delete(el)

    plainSelection(giverIdOf(el))
    if (spot.kind === 'withoutRow') {
      el.value = ''
      el.valueReport = withoutRowReport(el)
      return
    }
    el.valueReport = spot.kind === 'withoutSource' ? { kind: 'sourceMissing' } : NOT_READ
    return
  }

  const { row, source, sourceId, cleanCode, value } = spot
  const pindex = recordIndexOf(source, row)
  if (sourceId === '') data.set(el, { row, code: cleanCode, pindex })
  else data.delete(el)
  el.value = value
  el.valueReport = { kind: 'read' }

  setSelection(giverIdOf(el), row)
}

function writeLocal(el: ValueElement): Connected | undefined {
  const state = data.get(el)
  if (state) fieldWrite(state.row, state.code, currentValue(el))
  return state
}

function wire(el: ValueElement): void {
  if (wired.has(el)) return
  wired.add(el)
  el.addEventListener('input', () => { writeLocal(el) })
  el.addEventListener('change', () => {
    const state = writeLocal(el)
    runEvent(el, 'onChange', {
      VALUE: currentValue(el),
      PINDEX: state?.pindex ?? '',
    }).catch(reportChainsError)
  })
}

const link = makeDataLink<ValueElement>({ hydrate, wire })

export const valueRegistered = link.connect
export const valueDisconnected = link.disconnect

// The operator reads why the field stays empty, never an empty box. A field
// that read its record says nothing: an empty value is the record's answer,
// and a field without source and without binding is plain typing room.
export function valueReason(
  report: ValueReport,
  source: string,
  valueField: string,
): string {
  const sourceId = source.trim()
  const field = valueField.trim()
  if (sourceId === '' && field === '') return ''
  if (sourceId === '') return 'Diesem Feld fehlt die Datenquelle.'
  if (field === '') return 'Dieses Feld ist an kein Feld der Quelle gebunden.'

  switch (report.kind) {
    case 'read':
      return ''
    case 'sourceMissing':
      return 'Die Datenquelle dieses Feldes gibt es in dieser Maske nicht.'
    case 'withoutRecords':
      return `Die Quelle „${report.sourceName}“ hat keine Sätze.`
    case 'withoutChoice':
      return 'Es ist noch keine Zeile gewählt.'
    case 'withoutFitting':
      return `Zur gewählten Zeile gibt es keinen Satz aus „${report.sourceName}“.`
    case 'notRead':
      return 'Die Datenquelle dieses Feldes hat noch keine Daten geliefert.'
  }
}
