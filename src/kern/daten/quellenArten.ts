// Die Arten einer Datenquelle und was jede kann. Nur Schalter: die Wortwahl fuer
// den Editor steht in editor/zentrale/beschriftungen.ts, damit die Laufzeit der
// Maske sie nicht mittraegt.
export type QuellenArtKennung =
  | 'idb'
  | 'adressstamm'
  | 'artikelstamm'
  | 'beleg'
  | 'belegposition'
  | 'datei'
  | 'erpabfrage'
  | 'dataset'
  | 'relationswert'

// Was eine Art ausser Kennung und Feldern tragen darf. Als Liste, nicht als je
// ein Schalter: eine neue Angabe ist dann ein Wort in den Arten, die sie
// tragen, statt einer weiteren Spalte in allen neun.
//
// KOPFSATZ_INDEX  haengt an einem Kopfsatz (Positionen unter ihrem Beleg)
// INDEX_NR        traegt eine Satznummer ({PINDEX}); ohne sie kein Aendern
// VAR             kann statt einer Liste den offenen Satz liefern
// HOL_RELATION    holt die Zeilen selbst per Relation, statt bestellt zu werden
// FELD_VORSATZ    ihre Feldcodes tragen einen Vorsatz (ART_, ADR_)
// HOL_WERT        holt EINEN Wert per Relation und wird nie bestellt
export type Schluessel =
  | 'KOPFSATZ_INDEX'
  | 'INDEX_NR'
  | 'VAR'
  | 'HOL_RELATION'
  | 'FELD_VORSATZ'
  | 'HOL_WERT'

export interface QuellenArt {
  id: QuellenArtKennung

  tabellenId: string

  schluessel: readonly Schluessel[]

  felderEinzeln: boolean

  kopfsatzStandard: string

  bestellBlock: 'sefileloop' | 'erpapicall' | 'dataset'

  // Die Felder dieser Art heissen mit Klarnamen, nicht mit Position und Laenge.
  // Steuert Eingabe UND Pruefung.
  spaltenNamen: boolean

  // 'ID0001' zur IDB-Langform ausschreiben. Bei DataSets ist 'ID0001' die echte
  // Kennung und bleibt stehen.
  idbKurzform: boolean
}

export function traegt(art: QuellenArt, schluessel: Schluessel): boolean {
  return art.schluessel.includes(schluessel)
}

// Ohne feste Tabellen-ID traegt die Quelle sie als eigene Kennung; wer nichts
// bestellt, braucht sie nicht.
export function tabellenKennungNoetig(art: QuellenArt): boolean {
  return art.tabellenId === '' && !traegt(art, 'HOL_WERT')
}

const ARTEN: Record<QuellenArtKennung, QuellenArt> = {
  // Ein IDB-Satz wird ganz gelesen: seine Felder lassen sich nicht einzeln
  // bestellen, darum geht '*' hinaus.
  idb: {
    id: 'idb',
    tabellenId: '',
    schluessel: ['INDEX_NR'],
    felderEinzeln: false,
    kopfsatzStandard: '',
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
  },

  adressstamm: {
    id: 'adressstamm',
    tabellenId: 'ADR',
    schluessel: ['INDEX_NR', 'VAR'],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
  },

  artikelstamm: {
    id: 'artikelstamm',
    tabellenId: 'ART',
    schluessel: ['INDEX_NR'],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
  },

  beleg: {
    id: 'beleg',
    tabellenId: 'BEL',
    schluessel: ['INDEX_NR', 'VAR'],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
  },

  belegposition: {
    id: 'belegposition',
    tabellenId: 'POS',
    schluessel: ['KOPFSATZ_INDEX', 'HOL_RELATION', 'INDEX_NR', 'VAR'],
    felderEinzeln: true,
    kopfsatzStandard: 'BEL_0_11',
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
  },

  datei: {
    id: 'datei',
    tabellenId: '',
    schluessel: ['KOPFSATZ_INDEX', 'INDEX_NR'],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
  },

  erpabfrage: {
    id: 'erpabfrage',
    tabellenId: '',
    schluessel: ['FELD_VORSATZ'],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'erpapicall',
    spaltenNamen: false,
    idbKurzform: true,
  },

  dataset: {
    id: 'dataset',
    tabellenId: '',
    schluessel: [],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'dataset',
    spaltenNamen: true,
    idbKurzform: false,
  },

  // Kein Loop, kein VAR-Abschnitt, keine Satznummer: EIN Relations-Ruf, seine
  // Antwort als eine Zeile.
  relationswert: {
    id: 'relationswert',
    tabellenId: '',
    schluessel: ['HOL_WERT'],
    felderEinzeln: true,
    kopfsatzStandard: '',
    bestellBlock: 'sefileloop',
    spaltenNamen: true,
    idbKurzform: false,
  },
}

export function artFuer(kind: QuellenArtKennung): QuellenArt {
  return ARTEN[kind]
}

export const QUELLEN_ARTEN: readonly QuellenArt[] = Object.values(ARTEN)

export const QUELLEN_ART_KENNUNGEN: readonly QuellenArtKennung[] =
  QUELLEN_ARTEN.map((a) => a.id)
