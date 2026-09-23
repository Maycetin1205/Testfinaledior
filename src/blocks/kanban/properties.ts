import {
  booleanProperty,
  fieldProperty,
  sourceProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { dayFieldProperty } from '../behavior/source'
import { toneProperty } from '../behavior/tone'
import { COLUMN_TITLE_DEFAULT } from './places'

export const kanbanProperties = {
  source: sourceProperty({
    default: '',
    label: 'Datenquelle',
    place: 'none',
    attribute: 'source',
  }),
  columnsField: fieldProperty({
    default: '',
    label: 'Einsortieren nach',
    attribute: 'columnsfield',
  }),
  dayField: dayFieldProperty(),
}

export type KanbanValues = ValuesOf<typeof kanbanProperties>

export const kanbanColumnProperties = {
  tone: toneProperty(),
  heading: textProperty({
    default: COLUMN_TITLE_DEFAULT,
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
  }),
  value: textProperty({
    default: '',
    label: 'Wert im ERP',
    attribute: 'value',
  }),
  catchAll: booleanProperty({
    default: false,
    label: 'Auffangspalte',
    attribute: 'catchall',
    needsSource: true,
    onlyUnderSiblings: true,
  }),
}

export type KanbanColumnValues = ValuesOf<typeof kanbanColumnProperties>
