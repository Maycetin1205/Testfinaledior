import {
  choiceProperty,
  fieldProperty,
  segmentProperty,
  type ValuesOf,
} from '../../core/block/property'
import { DAY_FIELD_PROPERTY } from '../../core/block/dayFieldProperty'
import { SOURCE_PROPERTY } from '../../core/block/sourceProperty'
import { spotBinding, typedSpot } from '../parts/card'
import { toneOptions } from '../../core/block/tones'
import { kanbanColumnsProperty } from './columns'

export const kanbanProperties = {
  source: SOURCE_PROPERTY,
  columnsField: fieldProperty({
    default: '',
    label: 'Einsortieren nach',
    place: 'source',
    attribute: 'columnsfield',
  }),
  dayField: DAY_FIELD_PROPERTY,
  columns: kanbanColumnsProperty(),
  avatarKind: segmentProperty([
    { value: 'animal', name: 'Tiersymbol' },
    { value: 'image', name: 'Bild' },
  ], {
    default: 'animal',
    label: 'Avatar',
    place: 'display',
    attribute: 'avatarkind',
    when: { key: 'avatarField', notEquals: '' },
  }),
  chipTone: choiceProperty(toneOptions(), {
    default: 'info',
    label: 'Ton des Chips',
    place: 'display',
    attribute: 'chiptone',
  }),
  heading: typedSpot('Titel', 'heading'),
  heading2: typedSpot('Titel 2', 'heading2'),
  time: typedSpot('Zeit', 'time'),
  date: typedSpot('Datum', 'date'),
  subline: typedSpot('Unterzeile', 'subline'),
  text: typedSpot('Textzeile', 'text'),
  chip: typedSpot('Chip', 'chip'),
  headingField: spotBinding('Titel', 'headingfield'),
  heading2Field: spotBinding('Titel 2', 'heading2field'),
  timeField: spotBinding('Zeit', 'timefield'),
  dateField: spotBinding('Datum', 'datefield'),
  sublineField: spotBinding('Unterzeile', 'sublinefield'),
  textField: spotBinding('Textzeile', 'textfield'),
  chipField: spotBinding('Chip', 'chipfield'),
  avatarField: spotBinding('Avatar', 'avatarfield'),
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
  { prop: 'chip', name: 'Chip', several: true },
] as const

export type CardSpot = (typeof CARD_SPOTS)[number]['prop']

// The avatar is only ever bound: what its field holds, nothing typed.
export const AVATAR_SPOT = { prop: 'avatar', name: 'Avatar' } as const
