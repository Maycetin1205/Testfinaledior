import { fieldProperty, type Property } from '../../core/block/property'
import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { fieldRead, type RuntimeSource } from '../../softengine/data'
import { startSe, hasSeData, onSeData } from '../../softengine/bridge'
import { runtimeSource, rowsOfSource } from '../../softengine/runtimeSources'
import { onSelectionList } from './selection'
import { makeFieldReader, type FieldReader } from './foreignSources'
import { onChosenDay, chosenDay, dayKey } from './chosenDay'
import { wireFetchingSources } from './fetchingSources'

const SOURCE_ATTR = SOURCE_PROP.toLowerCase()

const DAY_FIELD_PROP = 'dayField'
const DAY_FIELD_ATTR = DAY_FIELD_PROP.toLowerCase()

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

function rowsAtDay(
  rows: readonly unknown[],
  dayCode: string,
  day: string,
): unknown[] {
  if (dayCode === '' || day === '') return [...rows]
  return rows.filter((row) => dayKey(fieldRead(row, dayCode)) === day)
}

export interface DataPreamble {
  source: RuntimeSource

  rows: unknown[]

  read: FieldReader
}

export function readDataPreamble(el: HTMLElement): DataPreamble | null {
  const sourceId = sourceIdOf(el)
  if (sourceId === '') return null
  const source = runtimeSource(sourceId)
  if (!source) return null
  const rows = rowsAtDay(
    rowsOfSource(source),
    el.getAttribute(DAY_FIELD_ATTR) ?? '',
    chosenDay(),
  )
  return { source, rows, read: makeFieldReader(el) }
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
