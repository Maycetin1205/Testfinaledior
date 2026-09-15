// Die Eigenschaften der Tabelle und ihrer Spalten, wie der Inspector sie zeigt.
import type { Eigenschaft } from '../../core/blocks/PropertyDescription'
import { jaNeinProperty } from '../shared/jaNeinProperty'
import { leerTextProperty } from '../shared/leerZustand'
import type { ListenBindung } from '../../core/blocks/BlockDefinition'
import {
  coerceSpalten,
  fuegeSpalteAn,
  mitVerschobenerSpalte,
  ohneSpalte,
  SPALTEN_MAX,
  STANDARD_TITEL,
} from './spalten'

export const TABELLE_EIGENSCHAFTEN: Eigenschaft[] = [
  jaNeinProperty(
    'suche',
    'Suchzeile',
    'Zeigt über der Tabelle ein Feld, mit dem der Bediener den Inhalt durchsucht.',
    { requiresDataSource: true },
  ),

  jaNeinProperty(
    'blaettern',
    'Blättern',
    'Ja: Seiten mit Blätter-Knöpfen. Nein: alles untereinander, der Rumpf rollt.',
  ),

  jaNeinProperty(
    'kopfzeile',
    'Kopfzeile',
    'Aus: keine Titelzeile, kein Sortieren per Titelklick.',
  ),

  jaNeinProperty(
    'spaltenwahl',
    'Spaltenwahl',
    'In der Maske: Rechtsklick auf eine Spaltenüberschrift nimmt Spalten weg '
      + 'und holt sie zurück. Braucht die Kopfzeile.',
  ),
  {
    attributeName: 'tagField',
    name: 'Tag filtern nach',
    description: 'Datumsfeld. Gesetzt: nur Sätze des gewählten Tages.',
    kind: 'field',
  },

  leerTextProperty(),
]

export const SPALTEN_BINDUNG: ListenBindung = {
  prop: 'spalten',
  titelKey: 'titel',
  feldKey: 'feld',
  kennungKey: 'kennung',
  standardTitel: STANDARD_TITEL,

  eintragNeu: (props) => {
    const alt = coerceSpalten(props.spalten)
    return alt.length >= SPALTEN_MAX ? {} : { spalten: fuegeSpalteAn(alt) }
  },
  eintragWeg: (props, index) => {
    const alt = coerceSpalten(props.spalten)
    const neu = ohneSpalte(alt, index)
    return neu === alt ? {} : { spalten: [...neu] }
  },
  eintragVerschieben: (props, von, nach) => {
    const alt = coerceSpalten(props.spalten)
    const neu = mitVerschobenerSpalte(alt, von, nach)
    return neu === alt ? {} : { spalten: [...neu] }
  },

  eintragStellen: '[data-ff-eintrag]',

  eintragsSchalter: [
    {
      key: 'summe',
      label: 'Summe in der Fußzeile',
      kurz: 'Summe',
    },
    {
      key: 'versteckt',
      label: 'In der Maske ausblenden',
      kurz: 'ausgeblendet',
    },
  ],
}
