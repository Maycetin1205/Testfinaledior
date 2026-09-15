// Die Eigenschaften des Formularfelds, wie der Inspector sie zeigt.
import type { Eigenschaft } from '../../core/blocks/PropertyDescription'
import { jaNeinProperty } from '../shared/jaNeinProperty'

const NUR_NACHSCHLAGEN = { attributeName: 'fieldType', equals: 'nachschlagen' } as const

export const FELD_EIGENSCHAFTEN: Eigenschaft[] = [
  {
    attributeName: 'fieldType',
    name: 'Feldtyp',
    description: 'Welche Art Eingabe das Feld annimmt.',
    kind: 'select',
    options: [
      { value: 'text', label: 'Text' },
      { value: 'number', label: 'Zahl' },
      { value: 'textarea', label: 'Mehrzeilig' },
      { value: 'select', label: 'Auswahl' },
      { value: 'date', label: 'Datum' },

      { value: 'time', label: 'Uhrzeit' },
      { value: 'checkbox', label: 'Ankreuzfeld' },
      { value: 'nachschlagen', label: 'Nachschlagen' },
    ],
  },
  {
    attributeName: 'options',
    name: 'Auswahl-Optionen',
    description: 'Einträge durch Komma getrennt, z. B. "Zimmer 1, Zimmer 2".',
    kind: 'text',
    visibleWhen: { attributeName: 'fieldType', equals: 'select' },
  },
  {
    attributeName: 'nachschlagQuelle',
    name: 'Quelle',
    description: 'Quelle, aus der der Bediener eine Zeile wählt.',
    kind: 'quelle',
    visibleWhen: NUR_NACHSCHLAGEN,
  },
  {
    attributeName: 'speicherFeld',
    name: 'Gespeichert wird',
    description: 'Feld, dessen Wert die Maske sich merkt (z. B. die Nummer).',
    kind: 'field',
    quelleProp: 'nachschlagQuelle',
    klarnameProp: 'speicherTitel',
    visibleWhen: NUR_NACHSCHLAGEN,
  },

  jaNeinProperty(
    'einzigerTreffer',
    'Einzigen Treffer übernehmen',
    'Bleibt genau ein Satz übrig, übernimmt das Feld ihn von selbst.',
    { visibleWhen: NUR_NACHSCHLAGEN },
  ),
  {
    attributeName: 'valueField',
    name: 'Feld',
    description: 'Feld, dessen Wert angezeigt wird.',
    kind: 'field',

    // Das Ankreuzfeld bleibt unbindbar, bis der SE-Wert-Kontrakt belegt ist.
    visibleWhen: { attributeName: 'fieldType', keinesVon: ['checkbox', 'nachschlagen'] },
  },
  {
    attributeName: 'darstellung',
    name: 'Darstellung',
    description: 'Kasten oder dezente Linie (z. B. Unterschriftsbereich).',
    kind: 'select',
    options: [
      { value: 'standard', label: 'Standard (Kasten)' },
      { value: 'linie', label: 'Linie (Unterstrichen)' },
    ],
    visibleWhen: { attributeName: 'fieldType', keinesVon: ['checkbox'] },
  },
]
