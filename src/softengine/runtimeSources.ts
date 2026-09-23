import { seWindow } from './bridge'
import { sourceFromList, isObject, rowsFromDelivery, type RuntimeSource } from './data'

export function runtimeSource(id: string): RuntimeSource | undefined {
  return sourceFromList(seWindow().FF_DATA_SOURCES, id)
}

export function runtimeSources(): RuntimeSource[] {
  const list: unknown = seWindow().FF_DATA_SOURCES
  if (!Array.isArray(list)) return []
  const out: RuntimeSource[] = []
  for (const entry of list) {
    if (!isObject(entry) || typeof entry.id !== 'string') continue
    const source = sourceFromList(list, entry.id)
    if (source) out.push(source)
  }
  return out
}

export function rowsOfSource(source: RuntimeSource): unknown[] {
  return rowsFromDelivery(seWindow().SEDATA, source.name, source.tableId, source.openRecord)
}
