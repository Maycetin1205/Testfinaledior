import {
  choiceProperty,
  fieldProperty,
  segmentProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { emphasisProperty, toneProperty } from '../look/look'

// The sizes of the reception mask a text may take, in px.
export const TEXT_SIZES: Readonly<Record<string, string>> = {
  '11': '--se-fs-chip',
  '12': '--se-fs-sm',
  '13': '--se-fs',
  '14': '--se-fs-lg',
  '15': '--se-fs-name',
  '16': '--se-fs-title',
  '19': '--se-fs-xl',
}

// The size of each role, as textStyle writes it. A label is 11.5 px, which is
// no size to choose.
const ROLE_SIZES = { title: '16', heading: '13', body: '13', muted: '12', number: '13' }

// Color and emphasis as at every block. Neutral leaves a plain text the ink
// of its role; Fläche voll, Fläche leicht and Nur Rand make the text a chip.
export const textProperties = {
  variant: choiceProperty([
    { value: 'title', name: 'Titel' },
    { value: 'heading', name: 'Überschrift' },
    { value: 'label', name: 'Beschriftung' },
    { value: 'body', name: 'Text' },
    { value: 'muted', name: 'Nebentext' },
    { value: 'number', name: 'Zahl' },
  ], {
    default: 'body',
    label: 'Rolle',
    attribute: 'variant',
  }),
  tone: toneProperty({ default: 'neutral', place: 'font' }),
  size: choiceProperty(Object.keys(TEXT_SIZES).map((value) => ({ value, name: value })), {
    default: '',
    label: 'Größe',
    place: 'font',
    attribute: 'size',
    preset: { by: 'variant', values: ROLE_SIZES },
  }),
  emphasis: emphasisProperty({ default: 'text' }),
  align: segmentProperty([
    { value: 'left', name: 'Links' },
    { value: 'center', name: 'Mitte' },
    { value: 'right', name: 'Rechts' },
  ], {
    default: 'left',
    label: 'Ausrichtung',
    attribute: 'align',
  }),
  text: textProperty({
    default: 'Text',
    label: 'Text',
    place: 'block',
    attribute: 'text',
  }),
  textField: fieldProperty({
    default: '',
    label: 'Textfeld',
    place: 'none',
    attribute: 'textfield',
  }),
}

export type TextValues = ValuesOf<typeof textProperties>
