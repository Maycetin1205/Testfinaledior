import {
  choiceProperty,
  fieldProperty,
  segmentProperty,
  sourceProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'

// The inks of the reception mask a text may take.
export const TEXT_COLORS: Readonly<Record<string, { name: string; token: string }>> = {
  dark: { name: 'Dunkel', token: '--se-ink' },
  grey: { name: 'Grau', token: '--se-muted' },
  light: { name: 'Hell', token: '--se-faint' },
  petrol: { name: 'Petrol', token: '--se-accent' },
  blue: { name: 'Blau', token: '--se-info-ink' },
  green: { name: 'Grün', token: '--se-success-ink' },
  ochre: { name: 'Ocker', token: '--se-warning-ink' },
  red: { name: 'Rot', token: '--se-danger-ink' },
}

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

// Color and size of each role, as textStyle writes them. A label is 11.5 px,
// which is no size to choose.
const ROLE_COLORS = { title: 'dark', heading: 'dark', label: 'grey', body: 'dark', muted: 'grey', number: 'dark' }
const ROLE_SIZES = { title: '16', heading: '13', body: '13', muted: '12', number: '13' }

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
  color: choiceProperty(Object.entries(TEXT_COLORS).map(([value, c]) => ({
    value,
    name: c.name,
    color: `var(${c.token})`,
  })), {
    default: '',
    label: 'Farbe',
    place: 'font',
    attribute: 'color',
    preset: { by: 'variant', values: ROLE_COLORS },
  }),
  size: choiceProperty(Object.keys(TEXT_SIZES).map((value) => ({ value, name: value })), {
    default: '',
    label: 'Größe',
    place: 'font',
    attribute: 'size',
    preset: { by: 'variant', values: ROLE_SIZES },
  }),
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
