import { bindingAttr } from '../../core/block/capability'
import { recordIndexOf, fieldWrite } from '../../softengine/data'
import { giverIdOf, clearSelection, setSelection } from '../behavior/selection'
import { makeDataLink } from '../behavior/source'
import { readBoundSpot } from '../behavior/boundSpot'
import { runEvent } from '../behavior/events'

export interface ValueElement extends HTMLElement {
  value: string

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

function hydrate(el: ValueElement): void {
  el.checkOwnValue?.()
  if (el.fillsSelf?.() === true) {
    data.delete(el)
    return
  }

  const spot = readBoundSpot(el, bindingAttr('value'))
  if (spot.kind !== 'value') {
    data.delete(el)

    clearSelection(giverIdOf(el))
    if (spot.kind === 'withoutRow') el.value = ''
    return
  }

  const { row, source, sourceId, cleanCode, value } = spot
  const pindex = recordIndexOf(source, row)
  if (sourceId === '') data.set(el, { row, code: cleanCode, pindex })
  else data.delete(el)
  el.value = value

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
    }).catch(() => {})
  })
}

const link = makeDataLink<ValueElement>({ hydrate, wire })

export const connectValue = link.connect
export const disconnectValue = link.disconnect
