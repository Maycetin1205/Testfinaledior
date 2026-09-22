import { fieldProperty, sourceProperty, type ValuesOf } from '../../core/block/property'
import { emptyTextProperty } from '../behavior/emptyState'
import { dayFieldProperty } from '../behavior/source'

export const kanbanProperties = {
  source: sourceProperty({
    default: '',
    label: 'Datenquelle',
    help: 'Die Quelle, deren Zeilen als Karten liegen.',
    place: 'none',
    attribute: 'source',
  }),
  columnsField: fieldProperty({
    default: '',
    label: 'Einsortieren nach',
    help: 'Feld, das die Spalte bestimmt. Leer: alle in die Auffang-Spalte.',
    attribute: 'columnsfield',
  }),
  dayField: dayFieldProperty(),
  emptyText: emptyTextProperty(),
}

export type KanbanValues = ValuesOf<typeof kanbanProperties>
