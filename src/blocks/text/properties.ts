import {
  booleanProperty,
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

// The size of each role, as textStyle writes it. Rubrik and Kopf are
// smaller than any size to choose.
const ROLE_SIZES = {
  title: '22', heading: '15', label: '12', body: '14', muted: '13', number: '14', hint: '12', amount: '26',
}

const WITH_SOURCE = { key: 'source', notEquals: '' }

// A switch of the settings window, group Anzeige.
const shows = (label: string, attribute: string) => booleanProperty({
  default: false,
  label,
  place: 'display',
  attribute,
})

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
    { value: 'rubric', name: 'Rubrik' },
    { value: 'head', name: 'Kopf' },
    { value: 'hint', name: 'Hilfe' },
    { value: 'amount', name: 'Betrag' },
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
  // One line; what is too long ends in an ellipsis.
  oneLine: shows('Einzeilig', 'oneline'),
  // At the bottom of the frame, the baseline a fixed step above its edge, so
  // texts of different sizes whose frames end on one row share the baseline.
  bottom: shows('Unten ausrichten', 'bottom'),
  // An empty value shows a quiet dash instead of a gap.
  emptyDash: shows('Leer zeigt Strich', 'emptydash'),
  // A number of zero or less stands red, like a stock that ran out.
  redBelowZero: shows('Null oder weniger rot', 'redbelowzero'),
  // A rule over the frame and a double rule under it, as under the total of
  // an invoice.
  sumRule: shows('Summenlinie', 'sumrule'),
  // What a text that follows a selection shows while no row is chosen.
  withoutChoice: choiceProperty([
    { value: 'empty', name: 'Leer lassen' },
    { value: 'hint', name: 'Hinweis zeigen' },
    { value: 'hide', name: 'Ausblenden' },
  ], {
    default: 'empty',
    label: 'Ohne Auswahl',
    place: 'display',
    attribute: 'withoutchoice',
    when: WITH_SOURCE,
  }),
  withoutHint: textProperty({
    default: '',
    label: 'Hinweis ohne Auswahl',
    place: 'display',
    attribute: 'withouthint',
    when: { key: 'withoutChoice', equals: 'hint', and: WITH_SOURCE },
  }),
}

export type TextValues = ValuesOf<typeof textProperties>
