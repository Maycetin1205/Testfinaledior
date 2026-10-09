import {
  choiceProperty,
  fieldProperty,
  segmentProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { emphasisProperty, toneProperty } from '../look/look'
import { symbolProperty } from '../look/symbol'

// The sizes of the sample docs/design/behandlung-modern.html a text may
// take, in px: from the label of a field up to the title of a page.
export const TEXT_SIZES: Readonly<Record<string, string>> = {
  '12': '--se-fs-sm',
  '13': '--se-fs',
  '14': '--se-fs-lg',
  '15': '--se-fs-name',
  '17': '--se-fs-title',
  '22': '--se-fs-xl',
  '26': '--se-fs-xxl',
}

// The size of each role, as textStyle writes it.
const ROLE_SIZES = { title: '22', heading: '15', label: '12', body: '14', muted: '13', number: '14' }

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
  symbol: symbolProperty(),
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
