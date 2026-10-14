import { fieldProperty, type ValuesOf } from '../../core/block/property'
import { DAY_FIELD_PROPERTY } from '../../core/block/dayFieldProperty'
import { avatarBinding, spotBinding } from '../parts/card'
import { kanbanColumnsProperty } from './columns'

export const kanbanProperties = {
  columnsField: fieldProperty({
    default: '',
    label: 'Einsortieren nach',
    place: 'source',
    attribute: 'columnsfield',
  }),
  dayField: DAY_FIELD_PROPERTY,
  avatarField: avatarBinding('Avatar'),
  columns: kanbanColumnsProperty(),
  headingField: spotBinding('Titel', 'headingfield'),
  heading2Field: spotBinding('Titel 2', 'heading2field'),
  timeField: spotBinding('Zeit', 'timefield'),
  dateField: spotBinding('Datum', 'datefield'),
  sublineField: spotBinding('Unterzeile', 'sublinefield'),
  textField: spotBinding('Textzeile', 'textfield'),
}

export type KanbanValues = ValuesOf<typeof kanbanProperties>

// The spots every card of the board has, in the order the editor offers them.
export const CARD_SPOTS = [
  { prop: 'time', name: 'Zeit', several: true },
  { prop: 'date', name: 'Datum', several: true },
  { prop: 'heading', name: 'Titel', several: true },
  { prop: 'heading2', name: 'Titel 2', several: true },
  { prop: 'subline', name: 'Unterzeile', several: true },
  { prop: 'text', name: 'Textzeile', several: true },
] as const

export type CardSpot = (typeof CARD_SPOTS)[number]['prop']
