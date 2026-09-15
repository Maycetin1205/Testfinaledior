// Die Eigenschaften des Formularfelds, wie der Inspector sie zeigt.
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { jaNeinEigenschaft } from '../../kern/maske/eigenschaft'

const NUR_NACHSCHLAGEN = { schluessel: 'fieldType', gleich: 'nachschlagen' } as const

export const FELD_EIGENSCHAFTEN: Eigenschaft[] = [
  {
    schluessel: 'fieldType',
    name: 'Feldtyp',
    beschreibung: 'Welche Art Eingabe das Feld annimmt.',
    art: 'select',
    optionen: [
      { wert: 'text', name: 'Text' },
      { wert: 'number', name: 'Zahl' },
      { wert: 'textarea', name: 'Mehrzeilig' },
      { wert: 'select', name: 'Auswahl' },
      { wert: 'date', name: 'Datum' },

      { wert: 'time', name: 'Uhrzeit' },
      { wert: 'checkbox', name: 'Ankreuzfeld' },
      { wert: 'nachschlagen', name: 'Nachschlagen' },
    ],
  },
  {
    schluessel: 'options',
    name: 'Auswahl-Optionen',
    beschreibung: 'Einträge durch Komma getrennt, z. B. "Zimmer 1, Zimmer 2".',
    art: 'text',
    wenn: { schluessel: 'fieldType', gleich: 'select' },
  },
  {
    schluessel: 'nachschlagQuelle',
    name: 'Quelle',
    beschreibung: 'Quelle, aus der der Bediener eine Zeile wählt.',
    art: 'quelle',
    wenn: NUR_NACHSCHLAGEN,
  },
  {
    schluessel: 'speicherFeld',
    name: 'Gespeichert wird',
    beschreibung: 'Feld, dessen Wert die Maske sich merkt (z. B. die Nummer).',
    art: 'field',
    quelleProp: 'nachschlagQuelle',
    klarnameProp: 'speicherTitel',
    wenn: NUR_NACHSCHLAGEN,
  },

  jaNeinEigenschaft(
    'einzigerTreffer',
    'Einzigen Treffer übernehmen',
    'Bleibt genau ein Satz übrig, übernimmt das Feld ihn von selbst.',
    { wenn: NUR_NACHSCHLAGEN },
  ),
  {
    schluessel: 'valueField',
    name: 'Feld',
    beschreibung: 'Feld, dessen Wert angezeigt wird.',
    art: 'field',

    // Das Ankreuzfeld bleibt unbindbar, bis der SE-Wert-Kontrakt belegt ist.
    wenn: { schluessel: 'fieldType', keinesVon: ['checkbox', 'nachschlagen'] },
  },
  {
    schluessel: 'darstellung',
    name: 'Darstellung',
    beschreibung: 'Kasten oder dezente Linie (z. B. Unterschriftsbereich).',
    art: 'select',
    optionen: [
      { wert: 'standard', name: 'Standard (Kasten)' },
      { wert: 'linie', name: 'Linie (Unterstrichen)' },
    ],
    wenn: { schluessel: 'fieldType', keinesVon: ['checkbox'] },
  },
]
