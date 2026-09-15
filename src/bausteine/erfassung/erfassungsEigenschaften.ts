// Die Eigenschaften der Erfassung und ihrer Spalten: die der Tabelle, plus alles, was schreibt.
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { EintragsSchalter, ListenBindung } from '../../kern/maske/bausteinArt'
import { schalterAn, schalterFuer } from '../../kern/maske/listenBindung'
import { jaNeinProperty } from '../shared/jaNeinProperty'
import type { Spalte } from '../tabelle/spalten'
import { SPALTEN_BINDUNG, TABELLE_EIGENSCHAFTEN } from '../tabelle/tabelleEigenschaften'

const LOESCHBAR = jaNeinProperty(
  'loeschbar',
  'Zeilen löschbar',
  'Kreuz an jeder Zeile: merkt sie zum Löschen vor.',
  { requiresDataSource: true },
)

// Hinter der Suchzeile, wo der Schalter in der Tabelle stand.
export const ERFASSUNG_EIGENSCHAFTEN: Eigenschaft[] = TABELLE_EIGENSCHAFTEN
  .flatMap((p) => (p.attributeName === 'suche' ? [p, LOESCHBAR] : [p]))

const AENDERBAR: EintragsSchalter = {
  key: 'aenderbar',
  label: 'In der Zeile änderbar',
  kurz: 'änderbar',
  standard: true,
  nurEigeneQuelle: true,
}

export const ERFASSUNG_SPALTEN_BINDUNG: ListenBindung = {
  ...SPALTEN_BINDUNG,

  eintragsSchalter: (SPALTEN_BINDUNG.eintragsSchalter ?? [])
    .flatMap((s) => (s.key === 'summe' ? [s, AENDERBAR] : [s])),

  eintragsFeldWahl: [
    {
      key: 'fuellFeld',
      // Die Beschriftung muss sagen, WANN das Feld gilt.
      label: 'Nachschlagen',
      hinweis: 'Beim Erfassen füllt der gewählte Satz der Hilfsquelle diese Zelle.',
      nurFremdeQuellen: true,
    },
  ],
}

export function spalteAenderbar(spalte: Spalte): boolean {
  const eintrag = spalte as unknown as Record<string, unknown>
  return spalte.feld !== ''
    && schalterFuer(ERFASSUNG_SPALTEN_BINDUNG, eintrag).includes(AENDERBAR)
    && schalterAn(AENDERBAR, eintrag)
}
