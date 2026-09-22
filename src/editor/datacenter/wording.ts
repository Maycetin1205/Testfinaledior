import type { StepKind } from '../../core/data/actions'
import type { DataField, SourceKindId } from '../../core/data/dataSources'

export interface SourcesWording {
  name: string

  keyLabel: string
  keyExample: string

  columnsLabel: string
  columnsExample: string

  standardFields: readonly DataField[]
}

const SOURCES_WORDING: Record<SourceKindId, SourcesWording> = {
  idb: {
    name: 'IDB-Tabelle',
    keyLabel: 'Kennung',
    keyExample: 'ID0001',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [],
  },
  addressMaster: {
    name: 'Adressstamm',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [],
  },
  itemMaster: {
    name: 'Artikelstamm',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [],
  },
  document: {
    name: 'Beleg',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [
      { code: '0_11', name: 'Satzschlüssel' },
      { code: '2_1', name: 'Belegart' },
      { code: '3_8', name: 'Belegnummer' },
      { code: '11_8', name: 'Kundennummer' },
      { code: '19_10', name: 'Belegdatum' },
      { code: '393_12', name: 'Warenwert' },
      { code: '441_12', name: 'MwSt-Betrag' },
      { code: '453_12', name: 'Gesamtbetrag' },
      { code: '3440_60', name: 'Bezeichnung' },
    ],
  },
  documentItem: {
    name: 'Belegpositionen',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [
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
  file: {
    name: 'Andere Datei',
    keyLabel: 'Kennung',
    keyExample: 'SERPOS',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [],
  },
  erpQuery: {
    name: 'ERP-Abfrage',
    keyLabel: 'Kennung',
    keyExample: 'LIEFERADRESSE.GET',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [],
  },
  dataset: {
    name: 'DataSet',
    keyLabel: 'DataSet-ID',
    keyExample: 'ID0001',
    columnsLabel: 'Spalte im DataSet',
    columnsExample: 'z. B. Chargennummer',
    standardFields: [],
  },
  relationValue: {
    name: 'Wert per Relation',
    keyLabel: '',
    keyExample: '',
    columnsLabel: 'Name in der Antwort',
    columnsExample: 'z. B. NUMMER',
    standardFields: [],
  },
  erpMask: {
    name: 'ERP-Maske',
    keyLabel: 'Maskennummer',
    keyExample: '1211S5OPT01',
    columnsLabel: '',
    columnsExample: '',
    standardFields: [],
  },
}

export function sourcesWording(kind: SourceKindId): SourcesWording {
  return SOURCES_WORDING[kind]
}

const STEP_NAMES: Record<StepKind, string> = {
  START_TOOL: 'START_TOOL',
  BW_LINK: 'BW-Befehl',
  RELATION: 'Relation',
  POPUP_OPEN: 'Popup öffnen',
  POPUP_CLOSE: 'Popup schließen',
}

export function stepName(typeKey: string): string {
  return STEP_NAMES[typeKey as StepKind] ?? typeKey
}
