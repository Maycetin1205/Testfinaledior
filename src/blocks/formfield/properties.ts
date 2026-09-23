import {
  booleanProperty,
  choiceProperty,
  fieldProperty,
  numberProperty,
  sourceProperty,
  structuredProperty,
  textProperty,
  type Condition,
  type ValuesOf,
} from '../../core/block/property'
import type { Column } from '../list/columns'
import { coerceLookupColumns } from '../behavior/lookup'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../behavior/DialogFrame'

export const FIELD_TYPES = [
  'text', 'number', 'textarea', 'select', 'date', 'time', 'checkbox', 'lookup',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const ONLY_LOOKUP: Condition = { key: 'fieldType', equals: 'lookup' }

export const WITHOUT_VALUE: readonly FieldType[] = ['checkbox', 'lookup']

export const formFieldProperties = {
  fieldType: choiceProperty([
    { value: 'text', name: 'Text' },
    { value: 'number', name: 'Zahl' },
    { value: 'textarea', name: 'Mehrzeilig' },
    { value: 'select', name: 'Auswahl' },
    { value: 'date', name: 'Datum' },
    { value: 'time', name: 'Uhrzeit' },
    { value: 'checkbox', name: 'Ankreuzfeld' },
    { value: 'lookup', name: 'Nachschlagen' },
  ], {
    default: 'text',
    label: 'Feldtyp',
    attribute: 'fieldtype',
  }),
  label: textProperty({
    default: 'Feldname',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
  options: textProperty({
    default: '',
    label: 'Auswahl-Optionen',
    attribute: 'options',
    when: { key: 'fieldType', equals: 'select' },
  }),
  source: sourceProperty({
    default: '',
    label: 'Datenquelle',
    place: 'none',
    attribute: 'source',
  }),
  value: textProperty({
    default: '',
    label: 'Wert',
    place: 'none',
    attribute: 'value',
  }),
  valueField: fieldProperty({
    default: '',
    label: 'Feld',
    attribute: 'valuefield',
    when: { key: 'fieldType', noneOf: WITHOUT_VALUE },
  }),
  lookupSource: sourceProperty({
    default: '',
    label: 'Quelle',
    attribute: 'lookupsource',
    when: ONLY_LOOKUP,
  }),
  storageField: fieldProperty({
    default: '',
    label: 'Gespeichert wird',
    attribute: 'storagefield',
    sourceProp: 'lookupSource',
    plainNameProp: 'storageTitle',
    when: ONLY_LOOKUP,
  }),
  storageTitle: textProperty({
    default: '',
    label: 'Gespeichert wird — Klarname',
    place: 'none',
    attribute: 'storagetitle',
  }),
  lookupColumns: structuredProperty<Column[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: coerceLookupColumns(raw) }
      : { ok: false }),
    toAttribute: (value) => JSON.stringify(value),
    fromAttribute: (raw) => coerceLookupColumns(raw ?? ''),
  }, {
    default: [],
    label: 'Spalten im Fenster',
    place: 'none',
    attribute: 'lookupcolumns',
  }),
  windowWidth: numberProperty({
    default: WINDOW_WIDTH,
    label: 'Fensterbreite',
    place: 'none',
    attribute: 'lookupwidth',
  }),
  windowHeight: numberProperty({
    default: WINDOW_HEIGHT,
    label: 'Fensterhöhe',
    place: 'none',
    attribute: 'lookupheight',
  }),
  onlyHit: booleanProperty({
    default: false,
    label: 'Einzigen Treffer übernehmen',
    attribute: 'onlyhit',
    when: ONLY_LOOKUP,
  }),
  appearance: choiceProperty([
    { value: 'standard', name: 'Standard (Kasten)' },
    { value: 'line', name: 'Linie (Unterstrichen)' },
  ], {
    default: 'standard',
    label: 'Darstellung',
    attribute: 'appearance',
    when: { key: 'fieldType', noneOf: ['checkbox'] },
  }),
}

export type FormFieldValues = ValuesOf<typeof formFieldProperties>
