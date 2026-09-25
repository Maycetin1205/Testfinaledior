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
import { coerceLookupColumns } from '../lookup/lookup'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../dialog/DialogFrame'

export const FIELD_TYPES = ['text', 'number', 'date', 'time', 'select', 'checkbox'] as const

export type FieldType = (typeof FIELD_TYPES)[number]

// Only a text field looks up; another field type switches it off.
export const ONLY_LOOKUP: Condition = { key: 'lookup', equals: true }

// A field that neither ticks nor looks up shows a value of its source.
export const WITH_VALUE: Condition = {
  key: 'fieldType',
  notEquals: 'checkbox',
  and: { key: 'lookup', notEquals: true },
}

export const formFieldProperties = {
  fieldType: choiceProperty([
    { value: 'text', name: 'Text' },
    { value: 'number', name: 'Zahl' },
    { value: 'date', name: 'Datum' },
    { value: 'time', name: 'Uhrzeit' },
    { value: 'select', name: 'Auswahl' },
    { value: 'checkbox', name: 'Ankreuzfeld' },
  ], {
    default: 'text',
    label: 'Feldtyp',
    attribute: 'fieldtype',
  }),
  lookup: booleanProperty({
    default: false,
    label: 'Nachschlagen',
    attribute: 'lookup',
    when: { key: 'fieldType', equals: 'text' },
    preset: { by: 'fieldType' },
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
    place: 'source',
    attribute: 'valuefield',
    when: WITH_VALUE,
  }),
  lookupSource: sourceProperty({
    default: '',
    label: 'Quelle',
    place: 'lookup',
    attribute: 'lookupsource',
    when: ONLY_LOOKUP,
  }),
  storageField: fieldProperty({
    default: '',
    label: 'Gespeichert wird',
    place: 'lookup',
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
    place: 'lookup',
    attribute: 'onlyhit',
    when: ONLY_LOOKUP,
  }),
  appearance: choiceProperty([
    { value: 'standard', name: 'Kasten' },
    { value: 'plain', name: 'Still' },
  ], {
    default: 'standard',
    label: 'Darstellung',
    attribute: 'appearance',
    when: { key: 'fieldType', noneOf: ['checkbox'] },
  }),
}

export type FormFieldValues = ValuesOf<typeof formFieldProperties>
