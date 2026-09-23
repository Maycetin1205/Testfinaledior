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
import type { Column } from '../behavior/columns'
import { coerceLookupColumns, WINDOW_HEIGHT, WINDOW_WIDTH } from '../behavior/lookup'

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
    help: 'Welche Art Eingabe das Feld annimmt.',
    attribute: 'fieldtype',
  }),
  label: textProperty({
    default: 'Feldname',
    label: 'Beschriftung',
    help: 'Was vor dem Feld steht.',
    place: 'block',
    attribute: 'label',
  }),
  options: textProperty({
    default: '',
    label: 'Auswahl-Optionen',
    help: 'Einträge durch Komma getrennt, z. B. "Zimmer 1, Zimmer 2".',
    attribute: 'options',
    when: { key: 'fieldType', equals: 'select' },
  }),
  source: sourceProperty({
    default: '',
    label: 'Datenquelle',
    help: 'Die Quelle, aus der das Feld seinen Wert liest.',
    place: 'none',
    attribute: 'source',
  }),
  value: textProperty({
    default: '',
    label: 'Wert',
    help: 'Was im Feld steht, solange kein Feld gebunden ist.',
    place: 'none',
    attribute: 'value',
  }),
  valueField: fieldProperty({
    default: '',
    label: 'Feld',
    help: 'Feld, dessen Wert angezeigt wird.',
    attribute: 'valuefield',
    when: { key: 'fieldType', noneOf: WITHOUT_VALUE },
  }),
  lookupSource: sourceProperty({
    default: '',
    label: 'Quelle',
    help: 'Quelle, aus der der Bediener eine Zeile wählt.',
    attribute: 'lookupsource',
    when: ONLY_LOOKUP,
  }),
  storageField: fieldProperty({
    default: '',
    label: 'Gespeichert wird',
    help: 'Feld, dessen Wert die Maske sich merkt (z. B. die Nummer).',
    attribute: 'storagefield',
    sourceProp: 'lookupSource',
    plainNameProp: 'storageTitle',
    when: ONLY_LOOKUP,
  }),
  storageTitle: textProperty({
    default: '',
    label: 'Gespeichert wird — Klarname',
    help: 'Der lesbare Name des gespeicherten Feldes.',
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
    help: 'Was das Nachschlage-Fenster zeigt.',
    place: 'none',
    attribute: 'lookupcolumns',
  }),
  windowWidth: numberProperty({
    default: WINDOW_WIDTH,
    label: 'Fensterbreite',
    help: 'Breite des Nachschlage-Fensters in Pixeln.',
    place: 'none',
    attribute: 'lookupwidth',
  }),
  windowHeight: numberProperty({
    default: WINDOW_HEIGHT,
    label: 'Fensterhöhe',
    help: 'Höhe des Nachschlage-Fensters in Pixeln.',
    place: 'none',
    attribute: 'lookupheight',
  }),
  onlyHit: booleanProperty({
    default: false,
    label: 'Einzigen Treffer übernehmen',
    help: 'Bleibt genau ein Satz übrig, übernimmt das Feld ihn von selbst.',
    attribute: 'onlyhit',
    when: ONLY_LOOKUP,
  }),
  appearance: choiceProperty([
    { value: 'standard', name: 'Standard (Kasten)' },
    { value: 'line', name: 'Linie (Unterstrichen)' },
  ], {
    default: 'standard',
    label: 'Darstellung',
    help: 'Kasten oder dezente Linie (z. B. Unterschriftsbereich).',
    attribute: 'appearance',
    when: { key: 'fieldType', noneOf: ['checkbox'] },
  }),
}

export type FormFieldValues = ValuesOf<typeof formFieldProperties>
