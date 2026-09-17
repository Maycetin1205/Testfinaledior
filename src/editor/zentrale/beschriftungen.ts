// Die Wortwahl des Editors: wie eine Quellenart und ein Kettenschritt heissen.
// Der Kern traegt nur die Schalter (kern/daten/quellenArten.ts, aktionen.ts),
// damit die Laufzeit der Maske diese Texte nicht mitschleppt.
import type { SchrittArt } from '../../kern/daten/aktionen'
import type { Datenfeld, QuellenArtKennung } from '../../kern/daten/datenquellen'

export interface QuellenWorte {
  name: string

  // Ein Satz, der sagt, wofuer die Art da ist. Steht in der Vorlagenwahl.
  beschreibung: string

  // Woerter, unter denen der Bediener sie sucht, wenn ihm der Name nicht
  // einfaellt: „Kunde" findet den Adressstamm, „Zeile" die Belegpositionen.
  suchworte: readonly string[]

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
    beschreibung: 'Eine IDB-Tabelle von SoftEngine, über ihre Kennung. Ihre Felder lassen sich nicht einzeln bestellen — es kommt der ganze Satz.',
    suchworte: ['idb', 'tabelle', 'stammdaten', 'liste'],
    kennungLabel: 'Kennung',
    kennungBeispiel: 'ID0001',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  adressstamm: {
    name: 'Adressstamm',
    beschreibung: 'Adressen: Kunden, Lieferanten, Ansprechpartner.',
    suchworte: ['adresse', 'kunde', 'lieferant', 'ansprechpartner', 'ADR'],
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  artikelstamm: {
    name: 'Artikelstamm',
    beschreibung: 'Artikel mit allem, was am Artikel hängt.',
    suchworte: ['artikel', 'ware', 'bestand', 'preis', 'ART'],
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  beleg: {
    name: 'Beleg',
    beschreibung: 'Der Kopf eines Belegs: Nummer, Datum, Adresse, Summen.',
    suchworte: ['beleg', 'kopf', 'rechnung', 'auftrag', 'lieferschein', 'BEL'],
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [
      { code: '0_11', name: 'Satzschlüssel' },
      { code: '2_1', name: 'Belegart' },
      { code: '3_8', name: 'Belegnummer' },
      { code: '11_8', name: 'Kundennummer' },
      { code: '19_10', name: 'Belegdatum' },
      { code: '393_12', name: 'Warenwert' },
      { code: '441_12', name: 'MwSt-Betrag' },
      { code: '453_12', name: 'Gesamtbetrag' },
      { code: '3440_60', name: 'Name' },
    ],
  },
  belegposition: {
    name: 'Belegpositionen',
    beschreibung: 'Die Zeilen eines Belegs. Sie hängen am Kopfsatz ihres Belegs.',
    suchworte: ['position', 'zeile', 'beleg', 'artikel', 'POS'],
    kennungLabel: '',
    kennungBeispiel: '',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [
      { code: '2_1', name: 'Belegart' },
      { code: '3_8', name: 'Belegnummer' },
      { code: '11_6', name: 'Positionsnummer' },

      { code: '17_1', name: 'Zeilenart' },
      { code: '18_25', name: 'Artikelnummer' },
      { code: '45_60', name: 'Bezeichnung' },
      { code: '164_8', name: 'Menge' },
      { code: '246_9', name: 'Einzelpreis' },
      { code: '280_12', name: 'Gesamtpreis' },
      { code: '372_5', name: 'MwSt-Satz' },

      { code: '645_10', name: 'Satznummer' },
      { code: '689_5', name: 'Mengeneinheit' },
      { code: '1401_12', name: 'Rohertrag' },

      { code: '2558_1', name: 'Farbkennzeichen' },
      { code: '3164_12', name: 'Rabatt' },
    ],
  },
  datei: {
    name: 'Andere Datei',
    beschreibung: 'Eine andere SoftEngine-Datei, über ihre Kennung.',
    suchworte: ['datei', 'charge', 'lager', 'CHA'],
    kennungLabel: 'Kennung',
    kennungBeispiel: 'SERPOS',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  erpabfrage: {
    name: 'ERP-Abfrage',
    beschreibung: 'Eine ERP-Abfrage. Bestellt ihre Felder namentlich, nicht den ganzen Satz.',
    suchworte: ['erp', 'abfrage', 'api', 'get', 'erpapicall'],
    kennungLabel: 'Kennung',
    kennungBeispiel: 'LIEFERADRESSE.GET',
    spaltenLabel: '',
    spaltenBeispiel: '',
    standardFelder: [],
  },
  dataset: {
    name: 'DataSet',
    beschreibung: 'Ein DataSet über seine Kennung. Seine Spalten heißen mit Klarnamen.',
    suchworte: ['dataset', 'spalten'],
    kennungLabel: 'DataSet-ID',
    kennungBeispiel: 'ID0001',
    spaltenLabel: 'Spalte im DataSet',
    spaltenBeispiel: 'z. B. Chargennummer',
    standardFelder: [],
  },
  relationswert: {
    name: 'Wert per Relation',
    beschreibung: 'EIN Wert, per Relation geholt. Wird nicht mit der Maske bestellt.',
    suchworte: ['relation', 'wert', 'einzelwert', 'get_relation'],
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
