import { bindingAttr } from '../../core/block/capability'
import { giverIdOf, clearSelection, setSelection } from '../../runtime/selection'
import { makeDataLink, recordOf } from '../../runtime/source'
import { maskState } from '../../runtime/maskState'
import { readBoundSpot } from '../../runtime/boundSpot'
import { runEvent } from '../../runtime/events'
import type { FormField } from './FormField'

interface Connected {
  row: unknown
  code: string
  pindex: string
}

const data = new WeakMap<FormField, Connected>()
const wired = new WeakSet<FormField>()

function hydrate(el: FormField): void {
  el.checkOwnValue()
  if (el.fillsSelf()) {
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
  const pindex = recordOf(source, row)
  if (sourceId === '') data.set(el, { row, code: cleanCode, pindex })
  else data.delete(el)
  el.value = value

  setSelection(giverIdOf(el), row)
}

function writeLocal(el: FormField): Connected | undefined {
  const state = data.get(el)
  if (state) maskState.host.writeField(state.row, state.code, el.value)
  return state
}

function wire(el: FormField): void {
  if (wired.has(el)) return
  wired.add(el)
  el.addEventListener('input', () => { writeLocal(el) })
  el.addEventListener('change', () => {
    const state = writeLocal(el)
    runEvent(el, 'onChange', {
      VALUE: el.value,
      PINDEX: state?.pindex ?? '',
    }).catch(() => {})
  })
}

const link = makeDataLink<FormField>({ hydrate, wire })

export const connectValue = link.connect
export const disconnectValue = link.disconnect
