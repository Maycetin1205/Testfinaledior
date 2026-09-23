import { fieldProperty, type Property } from '../../core/block/property'
import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { fieldRead, type RuntimeSource } from '../../softengine/data'
import { startSe, hasSeData, onSeData } from '../../softengine/bridge'
import { runtimeSource, rowsTheSource } from '../../softengine/runtimeSources'
import { onSelectionList } from './selection'
import { makeFieldReader, type FieldReader } from './foreignSources'
import { onChosenDay, chosenDay, tagKey } from './chosenDay'
import { wireFetchingSources } from './fetchingSources'

const SOURCE_ATTR = SOURCE_PROP.toLowerCase()

const TAG_FIELD_PROP = 'dayField'
const TAG_FIELD_ATTR = TAG_FIELD_PROP.toLowerCase()

export function sourceIdOf(el: Element): string {
  return el.getAttribute(SOURCE_ATTR) ?? ''
}

export function dayFieldProperty(): Property<string> {
  return fieldProperty({
    default: '',
    label: 'Tag filtern nach',
    attribute: 'dayfield',
  })
}

export function rowsAtTag(
  rows: readonly unknown[],
  tagCode: string,
  tag: string,
): unknown[] {
  if (tagCode === '' || tag === '') return [...rows]
  return rows.filter((row) => tagKey(fieldRead(row, tagCode)) === tag)
}

export interface DataPreamble {
  source: RuntimeSource

  rows: unknown[]

  // How many rows the source holds before the day filter takes some away.
  inSource: number

  read: FieldReader
}

export function holeDataPreamble(el: HTMLElement): DataPreamble | null {
  const sourceId = sourceIdOf(el)
  if (sourceId === '') return null
  const source = runtimeSource(sourceId)
  if (!source) return null
  const delivered = rowsTheSource(source)
  const rows = rowsAtTag(
    delivered,
    el.getAttribute(TAG_FIELD_ATTR) ?? '',
    chosenDay(),
  )
  return { source, rows, inSource: delivered.length, read: makeFieldReader(el) }
}

export interface DataLink<T extends HTMLElement> {
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
    if (!hasSeData()) return
    elements.forEach((el) => { opts.hydrate(el, delivery) })
  }

  const connect = (el: T): void => {
    if (el.hasAttribute('data-ff-editor')) return
    elements.add(el)
    opts.wire?.(el)

    if (!registered) {
      registered = true
      onSeData(hydrateAll)

      onChosenDay(() => { hydrateAll(false) })

      onSelectionList(() => { hydrateAll(false) })

      wireFetchingSources()
    }
    startSe()

    if (hasSeData()) opts.hydrate(el, false)
  }

  const disconnect = (el: T): void => {
    elements.delete(el)
  }

  return { connect, disconnect }
}
