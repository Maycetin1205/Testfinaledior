// Die Eigenschaften der Erfassung und ihrer Spalten: die der Tabelle, plus alles, was schreibt.
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { EintragsSchalter, ListenBindung } from '../../kern/maske/bausteinArt'
import { schalterAn, schalterFuer } from '../../kern/maske/listenBindung'
import { jaNeinEigenschaft } from '../../kern/maske/eigenschaft'
import type { Spalte } from '../faehigkeiten/spalten'
import { SPALTEN_BINDUNG } from '../faehigkeiten/spalten'
import { Tabelle } from '../tabelle/Tabelle'

const LOESCHBAR = jaNeinEigenschaft(
  'loeschbar',
  'Zeilen löschbar',
  'Kreuz an jeder Zeile: merkt sie zum Löschen vor.',
  { brauchtQuelle: true },
)

// Hinter der Suchzeile, wo der Schalter in der Tabelle stand.
export const ERFASSUNG_EIGENSCHAFTEN: Eigenschaft[] = Tabelle.eigenschaften
  .flatMap((p) => (p.schluessel === 'suche' ? [p, LOESCHBAR] : [p]))

const AENDERBAR: EintragsSchalter = {
  schluessel: 'aenderbar',
  name: 'In der Zeile änderbar',
  kurz: 'änderbar',
  standard: true,
  nurEigeneQuelle: true,
}

export const ERFASSUNG_SPALTEN_BINDUNG: ListenBindung = {
  ...SPALTEN_BINDUNG,

  eintragsSchalter: (SPALTEN_BINDUNG.eintragsSchalter ?? [])
    .flatMap((s) => (s.schluessel === 'summe' ? [s, AENDERBAR] : [s])),

  eintragsFeldWahl: [
    {
      schluessel: 'fuellFeld',
      // Die Beschriftung muss sagen, WANN das Feld gilt.
      name: 'Nachschlagen',
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
