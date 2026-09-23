import type { PropertyValue } from '../../core/block/property'
import { ROOT_ID, ROOT_TYPE, type BlockNode, type MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import type { Step } from '../../core/data/actions'
import { EXTRA_SOURCES_PROP } from '../../core/data/extraSources'

export const REFERENCE_SOURCES: readonly DataSource[] = [
  {
    id: 'q-pos',
    name: 'Belegpositionen',
    kind: 'documentItem',
    recordField: '645_10',
    fields: [
      { code: '18_25', name: 'ArtNr' },
      { code: '45_60', name: 'Bezeichnung' },
      { code: '164_8', name: 'Menge' },
    ],
  },
  {
    id: 'q-art',
    name: 'Artikelstamm',
    kind: 'itemMaster',
    fields: [
      { code: 'bez', name: 'Bezeichnung' },
      { code: 'unit', name: 'Einheit' },
    ],
  },
]

export const REFERENCE_RELATION: readonly RelationTemplate[] = [
  {
    id: 'r-get',
    name: 'Positionsfeld lesen',
    verb: 'GET_RELATION',
    nr: '69',
    parameter: ['BELART', 'POS', 'LEN', 'BELNR'],
  },
  {
    id: 'r-put',
    name: 'Feld schreiben',
    verb: 'PUT_RELATION',
    nr: '174',
    parameter: ['{PINDEX}', '45_60', 'L', ''],
    extraParameterAllowed: true,
  },
]

const CHAIN: Step[] = [
  {
    id: 's0',
    kind: 'RELATION',
    resultName: 'read',
    relationId: 'r-get',
    parameter: [
      { source: 'fixed', value: 'R' },
      { source: 'fixed', value: '0' },
      { source: 'fixed', value: '255' },
      { source: 'previousResult', value: '' },
    ],
    extraParameter: [],
  },
  {
    id: 's1',
    kind: 'RELATION',
    resultName: '',
    relationId: 'r-put',
    parameter: [
      { source: 'context', value: 'PINDEX' },
      { source: 'captureCell', value: 'sp-menge', blockId: 't1' },
      { source: 'fixed', value: 'L' },
      { source: 'stepResult', value: 's0' },
    ],
    extraParameter: [{ source: 'fixed', value: 'X' }],
  },
  { id: 's2', kind: 'START_TOOL', resultName: '', toolNumber: '42', toolParameter: ['a b'] },
  { id: 's3', kind: 'BW_LINK', resultName: '', command: '0,REFRESH' },
  { id: 's4', kind: 'POPUP_OPEN', resultName: '', popupId: 'p1' },
]

function node(
  id: string,
  type: string,
  parentId: string | null,
  props: Record<string, PropertyValue>,
  childIds: string[] = [],
): BlockNode {
  return { id, type: type, values: props, parentId: parentId, childIds: childIds }
}

export function referenceTree(): MaskTree {
  const tree: MaskTree = {
    [ROOT_ID]: node(ROOT_ID, ROOT_TYPE, null, {}, [
      't1', 't2', 'f1', 'b1', 'k1', 'tx1', 'd1', 'p1',
    ]),
    t1: node('t1', 'capture', ROOT_ID, {
      gridX: 0, gridY: 3, gridW: 16, gridH: 22,
      source: 'q-pos',
      [EXTRA_SOURCES_PROP]: [{ sourceId: 'q-art', partnerId: '', pairs: [] }],
      columns: [
        { key: 'sp-art', title: 'ArtNr', field: '18_25', kind: 'text' },
        { key: 'sp-bez', title: 'Bezeichnung', field: '45_60', kind: 'text', fillField: 'q-art::bez' },
        { key: 'sp-menge', title: 'Menge', field: '164_8', kind: 'text', editable: true },
        { key: 'sp-doppelt', title: 'Doppelt', field: '' },
      ],
      deletable: true,
      calculations: [{
        key: 'b1',
        name: 'Doppelt',
        lead: { kind: 'column', key: 'f0', column: 'sp-doppelt', unit: 'count', result: true, round: { decimals: 2, direction: 'nearest' } },
        numerator: [
          { kind: 'column', key: 'f1', column: 'sp-menge', unit: 'count', result: false, round: { decimals: 3, direction: 'nearest' } },
          { kind: 'number', key: 'f2', name: '2', number: 2, unit: 'count' },
        ],
        denominator: [],
      }],
    }),
    t2: node('t2', 'table', ROOT_ID, {
      gridX: 20, gridY: 25, gridW: 28, gridH: 12,
      source: 'q-pos',
      columns: [
        { key: 'sp-art', title: 'ArtNr', field: '18_25' },
        { key: 'sp-bez', title: 'Bezeichnung', field: '45_60' },
      ],
    }),
    f1: node('f1', 'formfield', ROOT_ID, {
      gridX: 10, gridY: 0, gridW: 16, gridH: 3,
      fieldType: 'text',
      label: 'Bezeichnung',
      source: 'q-pos',
      valueField: '45_60',
    }),
    b1: node('b1', 'button', ROOT_ID, {
      gridX: 26, gridY: 0, gridW: 8, gridH: 3, label: 'Schreiben',
    }),
    c1: node('c1', 'card', 'k1', {
      gridX: 0, gridY: 25, gridW: 12, gridH: 12, heading: 'Karte', headingField: '45_60',
    }),
    k1: node('k1', 'kanban', ROOT_ID, {
      gridX: 18, gridY: 3, gridW: 30, gridH: 22, source: 'q-pos', columnsField: '18_25',
    }, ['c1', 'ks1']),
    ks1: node('ks1', 'kanban-column', 'k1', {
      heading: 'Offen', value: 'ART-B', tone: 'info',
    }),
    tx1: node('tx1', 'text', ROOT_ID, { gridX: 34, gridY: 0, gridW: 14, gridH: 3 }),
    d1: node('d1', 'date', ROOT_ID, { gridX: 0, gridY: 0, gridW: 10, gridH: 3 }),
    p1: node('p1', 'popup', ROOT_ID, { name: 'Hinweis' }, ['tx2']),
    tx2: node('tx2', 'text', 'p1', {}),
  }
  tree.b1 = { ...tree.b1, chains: { onClick: CHAIN } }
  return tree
}
