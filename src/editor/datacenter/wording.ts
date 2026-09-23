import type { StepKind } from '../../core/data/actions'
import type { SourceKindId } from '../../core/data/dataSources'

export interface SourcesWording {
  name: string

  keyLabel: string

  columnsLabel: string

}

const SOURCES_WORDING: Record<SourceKindId, SourcesWording> = {
  idb: {
    name: 'IDB-Tabelle',
    keyLabel: 'Kennung',
    columnsLabel: '',
  },
  addressMaster: {
    name: 'Adressstamm',
    keyLabel: '',
    columnsLabel: '',
  },
  itemMaster: {
    name: 'Artikelstamm',
    keyLabel: '',
    columnsLabel: '',
  },
  document: {
    name: 'Beleg',
    keyLabel: '',
    columnsLabel: '',
  },
  documentItem: {
    name: 'Belegpositionen',
    keyLabel: '',
    columnsLabel: '',
  },
  file: {
    name: 'Andere Datei',
    keyLabel: 'Kennung',
    columnsLabel: '',
  },
  erpQuery: {
    name: 'ERP-Abfrage',
    keyLabel: 'Kennung',
    columnsLabel: '',
  },
  dataset: {
    name: 'DataSet',
    keyLabel: 'DataSet-ID',
    columnsLabel: 'Spalte im DataSet',
  },
  relationValue: {
    name: 'Wert per Relation',
    keyLabel: '',
    columnsLabel: 'Name in der Antwort',
  },
  erpMask: {
    name: 'ERP-Maske',
    keyLabel: 'Maskennummer',
    columnsLabel: '',
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
