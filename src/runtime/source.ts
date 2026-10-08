import { bindingFields, bindingJoiner } from '../core/block/binding'
import { fieldProperty, type Property } from '../core/block/property'
import { SOURCE_PROPERTY } from '../core/block/sourceProperty'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import type { RuntimeSource } from '../core/data/dataSources'
import { maskState } from './maskState'
import { followsFormField, onSelectionList, traitOf } from './selection'
import { keyedByFormField, makeFieldReader, type FieldReader } from './foreignSources'
import { onChosenDay, chosenDay, dayKey } from './chosenDay'
import { wireFetchingSources } from './fetchingSources'

// The field a list filters by the chosen day; the lists declare it, the
// mask reads it by the same declaration.
const DAY_FIELD: Property<string> = fieldProperty({
  default: '',
  label: 'Tag filtern nach',
  place: 'source',
  attribute: 'dayfield',
})

export function dayFieldProperty(): Property<string> {
  return DAY_FIELD
}

export function sourceIdOf(el: Element): string {
  return el.getAttribute(SOURCE_PROPERTY.attribute) ?? ''
}

// The record number the host knows a row by; empty when the source names none.
export function recordOf(source: RuntimeSource, row: unknown): string {
  return source.recordField === '' ? '' : maskState.host.readField(row, source.recordField)
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
    DAY_FIELD.type.fromAttribute(el.getAttribute(DAY_FIELD.attribute), DAY_FIELD.default),
    chosenDay(),
  )
  return { source, rows, read: makeFieldReader(el) }
}

// A bound spot shows its fields, the empty ones left out; any other what the
// builder typed.
export function spotValue(typed: string, binding: string, row: unknown, read: FieldReader): string {
  if (binding === '') return typed
  return bindingFields(binding)
    .map((field) => read(row, field))
    .filter((v) => v.trim() !== '')
    .join(bindingJoiner(binding))
}

// A row keeps its key across deliveries: the record number where it is
// unique, else the content, so a choice survives a delivery.
export function rowKeys(source: RuntimeSource, rows: readonly unknown[]): string[] {
  const recordCount = new Map<string, number>()
  for (const row of rows) {
    const record = recordOf(source, row)
    if (record !== '') recordCount.set(record, (recordCount.get(record) ?? 0) + 1)
  }
  const occurrences = new Map<string, number>()
  return rows.map((row) => {
    const record = recordOf(source, row)
    const unique = record !== '' && recordCount.get(record) === 1
    const base = JSON.stringify([source.id, unique ? 'record' : 'content', unique ? record : traitOf(row)])
    const number = occurrences.get(base) ?? 0
    occurrences.set(base, number + 1)
    return `${base}:${number}`
  })
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
