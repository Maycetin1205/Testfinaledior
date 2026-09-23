import { fieldProperty, textProperty, type ValuesOf } from '../../core/block/property'
import { toneProperty } from '../behavior/tone'

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

export const cardProperties = {
  chipTone: toneProperty('chiptone'),
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
}

export type CardValues = ValuesOf<typeof cardProperties>
