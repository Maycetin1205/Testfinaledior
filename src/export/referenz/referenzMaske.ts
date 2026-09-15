// Die feste Referenzmaske des Referenzabzugs: jeder Bausteintyp einmal.
import { WURZEL_ID, WURZEL_TYP, type Baustein, type Maskenbaum } from '../../kern/maske/baum'
import type { Datenquelle } from '../../kern/daten/datenquellen'
import type { RelationsVorlage } from '../../kern/daten/relationen'
import type { Schritt } from '../../kern/daten/aktionen'
import { WEITERE_QUELLEN_PROP } from '../../kern/daten/weitereQuellen'

// Feste Kennungen: der Export dieser Maske muss byte-gleich bleiben.

export const REFERENZ_QUELLEN: readonly Datenquelle[] = [
  {
    id: 'q-pos',
    name: 'Belegpositionen',
    kind: 'belegposition',
    indexField: '645_10',
    fields: [
      { code: '18_25', label: 'ArtNr' },
      { code: '45_60', label: 'Bezeichnung' },
      { code: '164_8', label: 'Menge' },
    ],
  },
  {
    id: 'q-art',
    name: 'Artikelstamm',
    kind: 'artikelstamm',
    fields: [
      { code: 'bez', label: 'Bezeichnung' },
      { code: 'einheit', label: 'Einheit' },
    ],
  },
]

export const REFERENZ_RELATIONEN: readonly RelationsVorlage[] = [
  {
    id: 'r-get',
    name: 'Positionsfeld lesen',
    verb: 'GET_RELATION',
    nr: '69',
    params: ['BELART', 'POS', 'LEN', 'BELNR'],
  },
  {
    id: 'r-put',
    name: 'Feld schreiben',
    verb: 'PUT_RELATION',
    nr: '174',
    params: ['{PINDEX}', '45_60', 'L', ''],
    allowExtraParams: true,
  },
]

const KETTE: Schritt[] = [
  {
    id: 's0',
    type: 'RELATION',
    resultKey: 'gelesen',
    relationId: 'r-get',
    params: [
      { source: 'fixed', value: 'R' },
      { source: 'fixed', value: '0' },
      { source: 'fixed', value: '255' },
      { source: 'previous_result', value: '' },
    ],
    extraParams: [],
  },
  {
    id: 's1',
    type: 'RELATION',
    resultKey: '',
    relationId: 'r-put',
    params: [
      { source: 'context', value: 'PINDEX' },
      { source: 'erfassungszelle', value: 'sp-menge', blockId: 't1' },
      { source: 'fixed', value: 'L' },
      { source: 'step_result', value: 's0' },
    ],
    extraParams: [{ source: 'fixed', value: 'X' }],
  },
  { id: 's2', type: 'START_TOOL', resultKey: '', toolNr: '42', toolParams: ['a b'] },
  { id: 's3', type: 'BW_LINK', resultKey: '', befehl: '0,REFRESH' },
  { id: 's4', type: 'POPUP_OPEN', resultKey: '', popupId: 'p1' },
]

function knoten(
  id: string,
  type: string,
  parentId: string | null,
  props: Record<string, unknown>,
  childIds: string[] = [],
): Baustein {
  return { id, type, props, parentId, childIds }
}

export function referenzBaum(): Maskenbaum {
  const tree: Maskenbaum = {
    [WURZEL_ID]: knoten(WURZEL_ID, WURZEL_TYP, null, {}, [
      't1', 't2', 'f1', 'b1', 'k1', 'n1', 'tx1', 'd1', 'tr1', 'p1',
    ]),
    t1: knoten('t1', 'erfassung', WURZEL_ID, {
      rasterX: 0, rasterY: 3, rasterW: 16, rasterH: 22,
      source: 'q-pos',
      [WEITERE_QUELLEN_PROP]: [{ quelleId: 'q-art', partnerId: '', keyPairs: [] }],
      spalten: [
        { kennung: 'sp-art', titel: 'ArtNr', feld: '18_25', art: 'text' },
        { kennung: 'sp-bez', titel: 'Bezeichnung', feld: '45_60', art: 'text', fuellFeld: 'q-art::bez' },
        { kennung: 'sp-menge', titel: 'Menge', feld: '164_8', art: 'text', aenderbar: true },
        { kennung: 'sp-doppelt', titel: 'Doppelt', feld: '' },
      ],
      loeschbar: 'ja',
      berechnungen: [{
        kennung: 'b1',
        name: 'Doppelt',
        leit: { art: 'spalte', kennung: 'f0', spalte: 'sp-doppelt', einheit: 'anzahl', ergebnis: true, runden: { stellen: 2, richtung: 'kfm' } },
        zaehler: [
          { art: 'spalte', kennung: 'f1', spalte: 'sp-menge', einheit: 'anzahl', ergebnis: false, runden: { stellen: 3, richtung: 'kfm' } },
          { art: 'zahl', kennung: 'f2', name: '2', zahl: 2, einheit: 'anzahl' },
        ],
        nenner: [],
      }],
    }),
    t2: knoten('t2', 'tabelle', WURZEL_ID, {
      rasterX: 20, rasterY: 25, rasterW: 28, rasterH: 12,
      source: 'q-pos',
      spalten: [
        { kennung: 'sp-art', titel: 'ArtNr', feld: '18_25' },
        { kennung: 'sp-bez', titel: 'Bezeichnung', feld: '45_60' },
      ],
    }),
    f1: knoten('f1', 'formfeld', WURZEL_ID, {
      rasterX: 10, rasterY: 0, rasterW: 16, rasterH: 3,
      fieldType: 'text',
      placeholder: 'Bezeichnung',
      source: 'q-pos',
      valueField: '45_60',
    }),
    b1: knoten('b1', 'button', WURZEL_ID, {
      rasterX: 26, rasterY: 0, rasterW: 8, rasterH: 3, label: 'Schreiben',
    }),
    c1: knoten('c1', 'card', 'km1', {
      rasterX: 0, rasterY: 25, rasterW: 12, rasterH: 12, heading: 'Karte', headingField: '45_60',
    }),
    k1: knoten('k1', 'kanban', WURZEL_ID, {
      rasterX: 18, rasterY: 3, rasterW: 30, rasterH: 22, source: 'q-pos', statusField: '18_25',
    }, ['km1', 'ks1']),
    km1: knoten('km1', 'kanban-muster', 'k1', {}, ['c1']),
    ks1: knoten('ks1', 'kanban-spalte', 'k1', {
      heading: 'Offen', wert: 'ART-B', variant: 'info',
    }, ['kz1']),
    kz1: knoten('kz1', 'kanban-zimmer', 'ks1', { heading: 'Zimmer 1', wert: 'Z1' }),
    n1: knoten('n1', 'navi', WURZEL_ID, {}, ['ne1']),
    ne1: knoten('ne1', 'navi-eintrag', 'n1', {}),
    tx1: knoten('tx1', 'text', WURZEL_ID, { rasterX: 34, rasterY: 0, rasterW: 14, rasterH: 3 }),
    d1: knoten('d1', 'datum', WURZEL_ID, { rasterX: 0, rasterY: 0, rasterW: 10, rasterH: 3 }),
    tr1: knoten('tr1', 'trenner', WURZEL_ID, {
      rasterX: 18, rasterY: 25, rasterW: 2, rasterH: 12,
      richtung: 'senkrecht', stil: 'dashed', staerke: 2, farbe: 'akzent',
    }),
    p1: knoten('p1', 'popup', WURZEL_ID, { name: 'Hinweis' }, ['tx2']),
    tx2: knoten('tx2', 'text', 'p1', {}),
  }
  tree.b1 = { ...tree.b1, events: { onClick: KETTE } }
  return tree
}
