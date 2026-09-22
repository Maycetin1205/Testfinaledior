import type { StepKind } from '../../core/data/actions'
import type { SourceKindId } from '../../core/data/dataSources'

export interface SourcesWording {
  name: string

  keyLabel: string
  keyExample: string

  columnsLabel: string
  columnsExample: string

}

const SOURCES_WORDING: Record<SourceKindId, SourcesWording> = {
  idb: {
    name: 'IDB-Tabelle',
    keyLabel: 'Kennung',
    keyExample: 'ID0001',
    columnsLabel: '',
    columnsExample: '',
  },
  addressMaster: {
    name: 'Adressstamm',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
  },
  itemMaster: {
    name: 'Artikelstamm',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
  },
  document: {
    name: 'Beleg',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
  },
  documentItem: {
    name: 'Belegpositionen',
    keyLabel: '',
    keyExample: '',
    columnsLabel: '',
    columnsExample: '',
  },
  file: {
    name: 'Andere Datei',
    keyLabel: 'Kennung',
    keyExample: 'SERPOS',
    columnsLabel: '',
    columnsExample: '',
  },
  erpQuery: {
    name: 'ERP-Abfrage',
    keyLabel: 'Kennung',
    keyExample: 'LIEFERADRESSE.GET',
    columnsLabel: '',
    columnsExample: '',
  },
  dataset: {
    name: 'DataSet',
    keyLabel: 'DataSet-ID',
    keyExample: 'ID0001',
    columnsLabel: 'Spalte im DataSet',
    columnsExample: 'z. B. Chargennummer',
  },
  relationValue: {
    name: 'Wert per Relation',
    keyLabel: '',
    keyExample: '',
    columnsLabel: 'Name in der Antwort',
    columnsExample: 'z. B. NUMMER',
  },
  erpMask: {
    name: 'ERP-Maske',
    keyLabel: 'Maskennummer',
    keyExample: '1211S5OPT01',
    columnsLabel: '',
    columnsExample: '',
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
