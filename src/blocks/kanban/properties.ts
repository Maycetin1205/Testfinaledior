import {
  booleanProperty,
  fieldProperty,
  sourceProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { emptyTextProperty } from '../behavior/emptyState'
import { dayFieldProperty } from '../behavior/source'
import { toneProperty } from '../behavior/tone'
import { COLUMN_TITLE_STANDARD } from './places'

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

export const kanbanColumnProperties = {
  tone: toneProperty(
    'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Rahmen).',
  ),
  heading: textProperty({
    default: COLUMN_TITLE_STANDARD,
    label: 'Titel',
    help: 'Die Überschrift der Spalte.',
    place: 'block',
    attribute: 'heading',
  }),
  value: textProperty({
    default: '',
    label: 'Wert im ERP',
    help: 'Steht im Statusfeld, wenn eine Karte hier liegt. Leer: der Titel.',
    attribute: 'value',
  }),
  catchAll: booleanProperty({
    default: false,
    label: 'Auffangspalte',
    help: 'Einträge ohne passenden Wert landen hier.',
    attribute: 'catchall',
    needsSource: true,
    onlyUnderSiblings: true,
  }),
}

export type KanbanColumnValues = ValuesOf<typeof kanbanColumnProperties>
