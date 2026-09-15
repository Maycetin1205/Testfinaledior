// Die Wortwahl des Editors: wie eine Quellenart und ein Kettenschritt heissen.
// Der Kern traegt nur die Schalter (core/data/quellenArten.ts, aktionen.ts),
// damit die Laufzeit der Maske diese Texte nicht mitschleppt.
import type { SchrittArt } from '../../core/data/aktionen'
import type { Datenfeld, QuellenArtKennung } from '../../core/data/dataSources'

export interface QuellenWorte {
  name: string

  // Wie die Kennung dieser Art heisst; leer, wo die Art eine feste Tabelle hat.
  kennungLabel: string
  kennungBeispiel: string

  // Wie die Namensspalte in der Feldliste heisst; leer, wo die Felder mit
  // Position und Laenge stehen.
  spaltenLabel: string
  spaltenBeispiel: string

  // Vorbelegung der Feldliste beim Umstellen der Art.
  standardFelder: readonly Datenfeld[]
}

const QUELLEN_WORTE: Record<QuellenArtKennung, QuellenWorte> = {
  idb: {
    name: 'IDB-Tabelle',
    kennungLabel: 'Kennung',
    kennungBeispiel: 'ID0001',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  adressstamm: {
    name: 'Adressstamm',
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  artikelstamm: {
    name: 'Artikelstamm',
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  beleg: {
    name: 'Beleg',
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [
      { code: '0_11', label: 'Satzschlüssel' },
      { code: '2_1', label: 'Belegart' },
      { code: '3_8', label: 'Belegnummer' },
      { code: '11_8', label: 'Kundennummer' },
      { code: '19_10', label: 'Belegdatum' },
      { code: '393_12', label: 'Warenwert' },
      { code: '441_12', label: 'MwSt-Betrag' },
      { code: '453_12', label: 'Gesamtbetrag' },
      { code: '3440_60', label: 'Name' },
    ],
  },
  belegposition: {
    name: 'Belegpositionen',
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [
      { code: '2_1', label: 'Belegart' },
      { code: '3_8', label: 'Belegnummer' },
      { code: '11_6', label: 'Positionsnummer' },

      { code: '17_1', label: 'Zeilenart' },
      { code: '18_25', label: 'Artikelnummer' },
      { code: '45_60', label: 'Bezeichnung' },
      { code: '164_8', label: 'Menge' },
      { code: '246_9', label: 'Einzelpreis' },
      { code: '280_12', label: 'Gesamtpreis' },
      { code: '372_5', label: 'MwSt-Satz' },

      { code: '645_10', label: 'Satznummer' },
      { code: '689_5', label: 'Mengeneinheit' },
      { code: '1401_12', label: 'Rohertrag' },

      { code: '2558_1', label: 'Farbkennzeichen' },
      { code: '3164_12', label: 'Rabatt' },
    ],
  },
  datei: {
    name: 'Andere Datei',
    kennungLabel: 'Kennung',
    kennungBeispiel: 'SERPOS',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  erpabfrage: {
    name: 'ERP-Abfrage',
    kennungLabel: 'Kennung',
    kennungBeispiel: 'LIEFERADRESSE.GET',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  dataset: {
    name: 'DataSet',
    kennungLabel: 'DataSet-ID',
    kennungBeispiel: 'ID0001',
    spaltenLabel: 'Spalte im DataSet',
    spaltenBeispiel: 'z. B. Chargennummer',
    standardFelder: [],
  },
  relationswert: {
    name: 'Wert per Relation',
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: 'Name in der Antwort',
    spaltenBeispiel: 'z. B. NUMMER',
    standardFelder: [],
  },
}

export function quellenWorte(kind: QuellenArtKennung): QuellenWorte {
  return QUELLEN_WORTE[kind]
}

// START_TOOL und BW-Befehl bleiben, wie SoftEngine sie nennt.
const SCHRITT_NAMEN: Record<SchrittArt, string> = {
  START_TOOL: 'START_TOOL',
  BW_LINK: 'BW-Befehl',
  RELATION: 'Relation',
  POPUP_OPEN: 'Popup öffnen',
  POPUP_CLOSE: 'Popup schließen',
}

export function schrittName(typeKey: string): string {
  return SCHRITT_NAMEN[typeKey as SchrittArt] ?? typeKey
}
