import { seWindow } from './bridge'
import { sourceFromList, isObjekt, rowsFromDelivery, type RuntimeSource } from './data'

export function runtimeSource(id: string): RuntimeSource | undefined {
  return sourceFromList(seWindow().FF_DATA_SOURCES, id)
}

export function runtimeSources(): RuntimeSource[] {
  const list: unknown = seWindow().FF_DATA_SOURCES
  if (!Array.isArray(list)) return []
  const out: RuntimeSource[] = []
  for (const entry of list) {
    if (!isObjekt(entry) || typeof entry.id !== 'string') continue
    const source = sourceFromList(list, entry.id)
    if (source) out.push(source)
  }
  return out
}

export function rowsTheSource(source: RuntimeSource): unknown[] {
  return rowsFromDelivery(seWindow().SEDATA, source.name, source.tableId, source.openRecord)
}
