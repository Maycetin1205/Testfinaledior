import {
  choiceProperty,
  fieldProperty,
  numberProperty,
  segmentProperty,
  sourceProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { toneOptions } from '../../core/block/tones'

export const SIZE_MIN = 6
export const SIZE_MAX = 96
export const SIZE_DEFAULT = 14

export const NEUTRAL_COLORS: readonly { value: string; name: string; token: string }[] = [
  { value: 'standard', name: 'Standard', token: '--se-ink' },
  { value: 'muted', name: 'Gedämpft', token: '--se-muted' },
  { value: 'accent', name: 'Akzent', token: '--se-accent' },
]

export const textProperties = {
  size: numberProperty({
    default: SIZE_DEFAULT,
    label: 'Größe',
    attribute: 'size',
    unit: 'px',
    min: SIZE_MIN,
    max: SIZE_MAX,
    row: 'Text-Stil',
  }),
  weight: segmentProperty([
    { value: 'thin', name: 'Dünn' },
    { value: 'normal', name: 'Normal' },
    { value: 'bold', name: 'Fett' },
  ], {
    default: 'normal',
    label: 'Gewicht',
    attribute: 'weight',
    row: 'Text-Stil',
  }),
  align: segmentProperty([
    { value: 'left', name: 'Links' },
    { value: 'center', name: 'Mitte' },
    { value: 'right', name: 'Rechts' },
  ], {
    default: 'left',
    label: 'Ausrichtung',
    attribute: 'align',
    row: 'Text-Stil',
  }),
  color: choiceProperty([
    ...NEUTRAL_COLORS.map((f) => ({ value: f.value, name: f.name, color: `var(${f.token})` })),
    ...toneOptions(),
  ], {
    default: 'standard',
    label: 'Farbe',
    attribute: 'color',
  }),
  text: textProperty({
    default: 'Text',
    label: 'Text',
    place: 'block',
    attribute: 'text',
  }),
  source: sourceProperty({
    default: '',
    label: 'Datenquelle',
    place: 'none',
    attribute: 'source',
  }),
  textField: fieldProperty({
    default: '',
    label: 'Textfeld',
    place: 'none',
    attribute: 'textfield',
  }),
}

export type TextValues = ValuesOf<typeof textProperties>
