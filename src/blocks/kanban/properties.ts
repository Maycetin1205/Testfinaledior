import {
  choiceProperty,
  fieldProperty,
  segmentProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { SOURCE_PROPERTY } from '../../core/block/sourceProperty'
import { toneOptions } from '../../core/block/tones'
import { dayFieldProperty } from '../../runtime/source'
import { kanbanColumnsProperty } from './columns'

// A spot of the card: typed on the card itself, or bound to a field.
function spot(label: string, attribute: string) {
  return textProperty({
    default: '',
    label,
    place: 'block',
    attribute,
  })
}

function spotField(label: string, attribute: string) {
  return fieldProperty({
    default: '',
    label: `${label} — Feld`,
    place: 'none',
    attribute,
  })
}

export const kanbanProperties = {
  source: SOURCE_PROPERTY,
  columnsField: fieldProperty({
    default: '',
    label: 'Einsortieren nach',
    place: 'source',
    attribute: 'columnsfield',
  }),
  dayField: dayFieldProperty(),
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
  heading: spot('Titel', 'heading'),
  heading2: spot('Titel 2', 'heading2'),
  time: spot('Zeit', 'time'),
  date: spot('Datum', 'date'),
  subline: spot('Unterzeile', 'subline'),
  text: spot('Textzeile', 'text'),
  chip: spot('Chip', 'chip'),
  headingField: spotField('Titel', 'headingfield'),
  heading2Field: spotField('Titel 2', 'heading2field'),
  timeField: spotField('Zeit', 'timefield'),
  dateField: spotField('Datum', 'datefield'),
  sublineField: spotField('Unterzeile', 'sublinefield'),
  textField: spotField('Textzeile', 'textfield'),
  chipField: spotField('Chip', 'chipfield'),
  avatarField: spotField('Avatar', 'avatarfield'),
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
