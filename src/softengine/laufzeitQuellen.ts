// Die Quellen und Zeilen der laufenden Maske, wie ein Baustein sie bekommt.
import { seGlobal } from './bridge'
import { findRuntimeDataSource, isRecord, rowsFor, type RuntimeDataSource } from './data'

export function laufzeitQuelle(id: string): RuntimeDataSource | undefined {
  return findRuntimeDataSource(seGlobal().FF_DATA_SOURCES, id)
}

export function laufzeitQuellen(): RuntimeDataSource[] {
  const liste: unknown = seGlobal().FF_DATA_SOURCES
  if (!Array.isArray(liste)) return []
  const raus: RuntimeDataSource[] = []
  for (const eintrag of liste) {
    if (!isRecord(eintrag) || typeof eintrag.id !== 'string') continue
    const quelle = findRuntimeDataSource(liste, eintrag.id)
    if (quelle) raus.push(quelle)
  }
  return raus
}

export function zeilenDerQuelle(quelle: RuntimeDataSource): unknown[] {
  return rowsFor(seGlobal().SEDATA, quelle.name, quelle.tableId, quelle.offenerSatz)
}
