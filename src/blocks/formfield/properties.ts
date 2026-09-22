import {
  choiceProperty,
  fieldProperty,
  sourceProperty,
  textProperty,
  type Condition,
  type ValuesOf,
} from '../../core/block/property'
import { lookupProperties } from '../behavior/lookupField'

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
  ...lookupProperties(ONLY_LOOKUP),
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
