import type { DataPreamble } from '../behavior/source'

const WITHOUT_SOURCE = 'Diesem Kanban ist keine Datenquelle zugewiesen.'

const UNKNOWN_SOURCE = 'Die Datenquelle dieses Kanbans gibt es in dieser Maske nicht.'

const WITHOUT_TEMPLATE = 'Diesem Kanban fehlt das Kartenmuster.'

export const WITHOUT_COLUMN = 'Dieses Kanban hat keine Spalte.'

// The operator reads why no card lies here, never an empty column. Empty means
// nothing is wrong: then the builder's own text has the say.
export function cardsReason(
  sourceId: string,
  preamble: DataPreamble | null,
  hasTemplate: boolean,
): string {
  if (sourceId.trim() === '') return WITHOUT_SOURCE
  if (!preamble) return UNKNOWN_SOURCE
  if (!hasTemplate) return WITHOUT_TEMPLATE
  const name = preamble.source.name
  if (preamble.inSource === 0) return `Die Datenquelle „${name}“ hat noch keine Sätze geliefert.`
  if (preamble.rows.length === 0) return `Am gewählten Tag steht kein Satz aus „${name}“.`
  return ''
}

function lie(count: number): string {
  return count === 1 ? 'Eine Karte liegt' : `${count} Karten liegen`
}

// Cards in a column their record does not name: say it instead of letting them
// pass as sorted.
export function misplacedNotice(
  withoutValue: number,
  withoutColumn: number,
  columnName: string,
): string {
  const notice: string[] = []
  if (withoutValue > 0) {
    notice.push(`${lie(withoutValue)} in „${columnName}“: Der Satz führt das Feld zum Einsortieren nicht.`)
  }
  if (withoutColumn > 0) {
    notice.push(`${lie(withoutColumn)} in „${columnName}“: Kein Spaltenwert passt.`)
  }
  return notice.join(' ')
}
