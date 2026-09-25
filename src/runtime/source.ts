import { fieldProperty, type Property } from '../core/block/property'
import { SOURCE_PROP } from '../core/block/sourceProperty'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import type { RuntimeSource } from '../core/data/dataSources'
import { maskState } from './maskState'
import { followsFormField, onSelectionList } from './selection'
import { keyedByFormField, makeFieldReader, type FieldReader } from './foreignSources'
import { onChosenDay, chosenDay, dayKey } from './chosenDay'
import { wireFetchingSources } from './fetchingSources'

const SOURCE_ATTR = SOURCE_PROP.toLowerCase()

const DAY_FIELD_PROP = 'dayField'
const DAY_FIELD_ATTR = DAY_FIELD_PROP.toLowerCase()

export function sourceIdOf(el: Element): string {
  return el.getAttribute(SOURCE_ATTR) ?? ''
}

// The record number the host knows a row by; empty when the source names none.
export function recordOf(source: RuntimeSource, row: unknown): string {
  return source.recordField === '' ? '' : maskState.host.readField(row, source.recordField)
}

export function dayFieldProperty(): Property<string> {
  return fieldProperty({
    default: '',
    label: 'Tag filtern nach',
    place: 'source',
    attribute: 'dayfield',
  })
}

function rowsAtDay(
  rows: readonly unknown[],
  dayCode: string,
  day: string,
): unknown[] {
  if (dayCode === '' || day === '') return [...rows]
  return rows.filter((row) => dayKey(maskState.host.readField(row, dayCode)) === day)
}

export interface DataPreamble {
  source: RuntimeSource

  rows: unknown[]

  read: FieldReader
}

export function readDataPreamble(el: HTMLElement): DataPreamble | null {
  const sourceId = sourceIdOf(el)
  if (sourceId === '') return null
  const source = maskState.host.source(sourceId)
  if (!source) return null
  const rows = rowsAtDay(
    maskState.host.rows(source),
    el.getAttribute(DAY_FIELD_ATTR) ?? '',
    chosenDay(),
  )
  return { source, rows, read: makeFieldReader(el) }
}

interface DataLink<T extends HTMLElement> {
  connect: (el: T) => void

  disconnect: (el: T) => void
}

export function makeDataLink<T extends HTMLElement>(opts: {
  hydrate: (el: T, delivery: boolean) => void

  wire?: (el: T) => void
}): DataLink<T> {
  const elements = new Set<T>()
  let registered = false

  const hydrateAll = (delivery: boolean): void => {
    if (!maskState.host.hasData()) return
    elements.forEach((el) => { opts.hydrate(el, delivery) })
  }

  const connect = (el: T): void => {
    elements.add(el)
    opts.wire?.(el)

    if (!registered) {
      registered = true
      maskState.host.onData(hydrateAll)

      onChosenDay(() => { hydrateAll(false) })

      onSelectionList(() => { hydrateAll(false) })

      // A block keyed by a form field or following one reads anew once the
      // field's value changes.
      el.ownerDocument.addEventListener('change', (e) => {
        const blockId = e.target instanceof Element ? e.target.getAttribute(BLOCK_ID_ATTR) : null
        if (blockId === null || !maskState.host.hasData()) return
        elements.forEach((other) => {
          if (keyedByFormField(other, blockId) || followsFormField(other, blockId)) opts.hydrate(other, false)
        })
      }, true)

      wireFetchingSources()
    }
    maskState.host.start()

    if (maskState.host.hasData()) opts.hydrate(el, false)
  }

  const disconnect = (el: T): void => {
    elements.delete(el)
  }

  return { connect, disconnect }
}
