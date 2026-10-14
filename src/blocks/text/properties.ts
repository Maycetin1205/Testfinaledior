import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  segmentProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { symbolProperty } from '../look/symbol'

// The sizes a text may take, in px: from the label of a field up to the
// title of a page. 30 was 26 up to the paper look (schema 35).
export const TEXT_SIZES: Readonly<Record<string, string>> = {
  '12': '--se-fs-sm',
  '13': '--se-fs',
  '14': '--se-fs-lg',
  '15': '--se-fs-name',
  '17': '--se-fs-title',
  '22': '--se-fs-xl',
  '30': '--se-fs-xxl',
}

// The size of each role, as textStyle writes it. Rubrik and Kopf are
// smaller than any size to choose.
const ROLE_SIZES = {
  title: '22', heading: '15', label: '12', body: '14', muted: '13', number: '14', hint: '12', amount: '30',
}

const WITH_LABEL = { key: 'showLabel', equals: true }

// A text takes the ink and weight of its role.
export const textProperties = {
  variant: choiceProperty([
    { value: 'title', name: 'Titel' },
    { value: 'heading', name: 'Überschrift' },
    { value: 'label', name: 'Beschriftung' },
    { value: 'body', name: 'Text' },
    { value: 'muted', name: 'Nebentext' },
    { value: 'number', name: 'Zahl' },
    { value: 'rubric', name: 'Rubrik' },
    { value: 'head', name: 'Kopf' },
    { value: 'hint', name: 'Hilfe' },
    { value: 'amount', name: 'Betrag' },
  ], {
    default: 'body',
    label: 'Rolle',
    attribute: 'variant',
  }),
  size: choiceProperty(Object.keys(TEXT_SIZES).map((value) => ({ value, name: value })), {
    default: '',
    label: 'Größe',
    place: 'font',
    attribute: 'size',
    preset: { by: 'variant', values: ROLE_SIZES },
  }),
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
  // Linie: the text stands on a hairline, a line the builder lays under a
  // value (Belegerfassung, user 14.10.).
  appearance: choiceProperty([
    { value: 'plain', name: 'Ohne' },
    { value: 'line', name: 'Linie' },
  ], {
    default: 'plain',
    label: 'Art',
    attribute: 'appearance',
  }),
  text: textProperty({
    default: 'Text',
    label: 'Text',
    place: 'block',
    attribute: 'text',
  }),
  // The label stands small above the text, as over the value of a field, so
  // a text and a field with their labels stand on one line. Left empty it
  // names the bound fields. Struck in 5g, back the same day (user).
  showLabel: booleanProperty({
    default: false,
    label: 'Beschriftung',
    attribute: 'showlabel',
  }),
  label: textProperty({
    default: '',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
    when: WITH_LABEL,
  }),
  textField: fieldProperty({
    default: '',
    label: 'Textfeld',
    place: 'none',
    attribute: 'textfield',
  }),
}

export type TextValues = ValuesOf<typeof textProperties>
