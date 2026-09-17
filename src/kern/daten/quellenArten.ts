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

export interface QuellenArt {
  id: QuellenArtKennung

  tabellenId: string

  felderEinzeln: boolean

  kopfsatzMoeglich: boolean

  kopfsatzStandard: string

  relationLadenMoeglich: boolean

  // Zeilen dieser Art tragen eine Satznummer ({PINDEX}). Reine Lesequellen haben
  // keine; dort machte sie Aendern und Loeschen scheinbar moeglich.
  satzNummerMoeglich: boolean

  varMoeglich: boolean

  bestellBlock: 'sefileloop' | 'erpapicall' | 'dataset'

  // Die Felder dieser Art heissen mit Klarnamen, nicht mit Position und Laenge.
  // Steuert Eingabe UND Pruefung.
  spaltenNamen: boolean

  // 'ID0001' zur IDB-Langform ausschreiben. Bei DataSets ist 'ID0001' die echte
  // Kennung und bleibt stehen.
  idbKurzform: boolean

  feldVorsatzMoeglich: boolean

  // Diese Art holt ihren Wert selbst per Relation und wird nie bestellt.
  holWertMoeglich: boolean
}

// Ohne feste Tabellen-ID traegt die Quelle sie als eigene Kennung; wer nichts
// bestellt, braucht sie nicht.
export function tabellenKennungNoetig(art: QuellenArt): boolean {
  return art.tabellenId === '' && !art.holWertMoeglich
}

const ARTEN: Record<QuellenArtKennung, QuellenArt> = {
  idb: {
    id: 'idb',
    tabellenId: '',
    felderEinzeln: false,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: true,
    varMoeglich: false,
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },
  adressstamm: {
    id: 'adressstamm',
    tabellenId: 'ADR',
    felderEinzeln: true,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: true,
    varMoeglich: true,
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },
  artikelstamm: {
    id: 'artikelstamm',
    tabellenId: 'ART',
    felderEinzeln: true,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: true,
    varMoeglich: false,
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },
  beleg: {
    id: 'beleg',
    tabellenId: 'BEL',
    felderEinzeln: true,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: true,
    varMoeglich: true,

    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },

  belegposition: {
    id: 'belegposition',
    tabellenId: 'POS',
    felderEinzeln: true,
    kopfsatzMoeglich: true,
    kopfsatzStandard: 'BEL_0_11',
    relationLadenMoeglich: true,
    satzNummerMoeglich: true,

    varMoeglich: true,

    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },

  datei: {
    id: 'datei',
    tabellenId: '',
    felderEinzeln: true,
    kopfsatzMoeglich: true,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: true,
    varMoeglich: false,
    bestellBlock: 'sefileloop',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },

  erpabfrage: {
    id: 'erpabfrage',
    tabellenId: '',
    felderEinzeln: true,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: false,
    varMoeglich: false,
    bestellBlock: 'erpapicall',
    spaltenNamen: false,
    idbKurzform: true,
    feldVorsatzMoeglich: true,
    holWertMoeglich: false,
  },
  dataset: {
    id: 'dataset',
    tabellenId: '',
    felderEinzeln: true,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: false,
    varMoeglich: false,
    bestellBlock: 'dataset',
    spaltenNamen: true,
    idbKurzform: false,
    feldVorsatzMoeglich: false,
    holWertMoeglich: false,
  },

  // Kein Loop, kein VAR-Abschnitt, keine Satznummer: EIN Relations-Ruf, seine
  // Antwort als eine Zeile.
  relationswert: {
    id: 'relationswert',
    tabellenId: '',
    felderEinzeln: true,
    kopfsatzMoeglich: false,
    kopfsatzStandard: '',
    relationLadenMoeglich: false,
    satzNummerMoeglich: false,
    varMoeglich: false,
    bestellBlock: 'sefileloop',
    spaltenNamen: true,
    idbKurzform: false,
    feldVorsatzMoeglich: false,
    holWertMoeglich: true,
  },
}

export function artFuer(kind: QuellenArtKennung): QuellenArt {
  return ARTEN[kind]
}

export const QUELLEN_ARTEN: readonly QuellenArt[] = Object.values(ARTEN)

export const QUELLEN_ART_KENNUNGEN: readonly QuellenArtKennung[] =
  QUELLEN_ARTEN.map((a) => a.id)
