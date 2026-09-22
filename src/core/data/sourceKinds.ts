export type SourceKindId =
  | 'idb'
  | 'addressMaster'
  | 'itemMaster'
  | 'document'
  | 'documentItem'
  | 'file'
  | 'erpQuery'
  | 'dataset'
  | 'relationValue'
  | 'erpMask'

export interface SourceKind {
  id: SourceKindId

  tableId: string

  fieldsSingle: boolean

  headerKeyPossible: boolean


  relationLoadPossible: boolean

  recordNumberPossible: boolean

  varPossible: boolean

  orderBlock: 'sefileloop' | 'erpapicall' | 'dataset' | 'mask'

  areaNeeded: boolean

  columnsNames: boolean

  idbShortForm: boolean

  fieldPrefixPossible: boolean

  getValuePossible: boolean
}

export function tableKeyNeeded(kind: SourceKind): boolean {
  return kind.tableId === '' && !kind.getValuePossible
}

const KINDS: Record<SourceKindId, SourceKind> = {
  idb: {
    id: 'idb',
    tableId: '',
    fieldsSingle: false,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: true,
    varPossible: false,
    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },
  addressMaster: {
    id: 'addressMaster',
    tableId: 'ADR',
    fieldsSingle: true,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: true,
    varPossible: true,
    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },
  itemMaster: {
    id: 'itemMaster',
    tableId: 'ART',
    fieldsSingle: true,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: true,
    varPossible: false,
    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },
  document: {
    id: 'document',
    tableId: 'BEL',
    fieldsSingle: true,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: true,
    varPossible: true,

    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },

  documentItem: {
    id: 'documentItem',
    tableId: 'POS',
    fieldsSingle: true,
    headerKeyPossible: true,
    relationLoadPossible: true,
    recordNumberPossible: true,

    varPossible: true,

    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },

  file: {
    id: 'file',
    tableId: '',
    fieldsSingle: true,
    headerKeyPossible: true,
    relationLoadPossible: false,
    recordNumberPossible: true,
    varPossible: false,
    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },

  erpQuery: {
    id: 'erpQuery',
    tableId: '',
    fieldsSingle: true,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: false,
    varPossible: false,
    orderBlock: 'erpapicall',
    areaNeeded: false,
    columnsNames: false,
    idbShortForm: true,
    fieldPrefixPossible: true,
    getValuePossible: false,
  },
  dataset: {
    id: 'dataset',
    tableId: '',
    fieldsSingle: true,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: false,
    varPossible: false,
    orderBlock: 'dataset',
    areaNeeded: false,
    columnsNames: true,
    idbShortForm: false,
    fieldPrefixPossible: false,
    getValuePossible: false,
  },

  relationValue: {
    id: 'relationValue',
    tableId: '',
    fieldsSingle: true,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: false,
    varPossible: false,
    orderBlock: 'sefileloop',
    areaNeeded: false,
    columnsNames: true,
    idbShortForm: false,
    fieldPrefixPossible: false,
    getValuePossible: true,
  },

  erpMask: {
    id: 'erpMask',
    tableId: '',
    fieldsSingle: false,
    headerKeyPossible: false,
    relationLoadPossible: false,
    recordNumberPossible: false,
    varPossible: false,
    orderBlock: 'mask',
    areaNeeded: true,
    columnsNames: false,
    idbShortForm: false,

    fieldPrefixPossible: true,
    getValuePossible: false,
  },
}

export function sourceKind(kind: SourceKindId): SourceKind {
  return KINDS[kind]
}

export const SOURCE_KINDS: readonly SourceKind[] = Object.values(KINDS)

export const SOURCE_KIND_IDS: readonly SourceKindId[] =
  SOURCE_KINDS.map((a) => a.id)
