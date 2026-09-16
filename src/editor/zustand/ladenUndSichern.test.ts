import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../../bausteine/anmeldung'
import { WURZEL_ID, WURZEL_TYP } from '../../kern/maske/baum'
import { meldungen } from './meldungen'
import { CURRENT_SCHEMA_VERSION } from './maskenSchema'
import { pruefeBaumStand } from './ladeKette'
import { backupKeyFor, letzteKopie } from './notfallkopie'
import { loadFromStorage, STORAGE_KEY } from './persistence'

// Hier haengt, dass kein gespeicherter Stand stumm verschwindet: was der Editor
// nicht lesen kann, muss er sichern — und was er meldet, muss stimmen.

class SpeicherStub {
  readonly daten = new Map<string, string>()
  schreibsperre = false

  get length(): number { return this.daten.size }
  key(i: number): string | null { return [...this.daten.keys()][i] ?? null }
  getItem(k: string): string | null { return this.daten.get(k) ?? null }

  setItem(k: string, v: string): void {
    if (this.schreibsperre) throw new Error('Speicher voll')
    this.daten.set(k, v)
  }

  removeItem(k: string): void { this.daten.delete(k) }
  clear(): void { this.daten.clear() }
}

let speicher: SpeicherStub

beforeEach(() => {
  speicher = new SpeicherStub()
  vi.stubGlobal('localStorage', speicher)
  meldungen.leere()
})

afterEach(() => {
  vi.unstubAllGlobals()
  meldungen.leere()
})

function kopien(schluessel: string): string[] {
  return [...speicher.daten.keys()].filter((k) => k.startsWith(`${backupKeyFor(schluessel)}_`))
}

function meldungsText(): string {
  return meldungen.liste.map((m) => m.text).join('\n---\n')
}

function wurzelBaum(kinder: string[]): Record<string, unknown> {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: kinder },
  }
}

test('zwei verschiedene Beschaedigungen ergeben zwei Notfallkopien', () => {
  speicher.setItem(STORAGE_KEY, '{kaputt')
  expect(loadFromStorage()).toBeNull()
  speicher.setItem(STORAGE_KEY, '{ganz anders kaputt')
  expect(loadFromStorage()).toBeNull()

  const inhalte = kopien(STORAGE_KEY).map((k) => speicher.getItem(k)).sort()
  expect(inhalte).toEqual(['{ganz anders kaputt', '{kaputt'])
})

test('derselbe beschaedigte Inhalt wird nicht bei jedem Start erneut abgelegt', () => {
  speicher.setItem(STORAGE_KEY, '{kaputt')
  loadFromStorage()
  loadFromStorage()

  expect(kopien(STORAGE_KEY)).toHaveLength(1)
})

test('misslingt die Kopie, behauptet die Meldung nicht sie sei gesichert', () => {
  speicher.setItem(STORAGE_KEY, '{kaputt')
  speicher.schreibsperre = true

  expect(loadFromStorage()).toBeNull()
  expect(kopien(STORAGE_KEY)).toHaveLength(0)
  expect(meldungsText()).not.toContain('gesichert')
  expect(meldungsText()).toContain('NICHT anlegen')
})

test('ein Stand aus einem neueren Editor wird gesichert, gemeldet und nicht geladen', () => {
  const roh = JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    tree: wurzelBaum([]),
    selectedId: null,
  })
  speicher.setItem(STORAGE_KEY, roh)

  expect(loadFromStorage()).toBeNull()
  expect(speicher.getItem(STORAGE_KEY)).toBe(roh)
  expect(kopien(STORAGE_KEY).map((k) => speicher.getItem(k))).toEqual([roh])
  expect(meldungsText()).toContain('neueren Version')
})

test('ein entfernter Kanban-Bausteintyp wird ohne Teilimport abgelehnt', () => {
  const tree = {
    ...wurzelBaum(['kb']),
    kb: { id: 'kb', typ: 'kanban', werte: {}, elternId: WURZEL_ID, kinderIds: ['vor'] },
    vor: { id: 'vor', typ: 'kanban-vorlage', werte: {}, elternId: 'kb', kinderIds: ['c1', 'c2'] },
    c1: { id: 'c1', typ: 'card', werte: {}, elternId: 'vor', kinderIds: [] },
    c2: { id: 'c2', typ: 'card', werte: {}, elternId: 'vor', kinderIds: [] },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId: null,
    datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  const original = speicher.getItem(STORAGE_KEY)
  expect(loadFromStorage()).toBeNull()
  expect(speicher.getItem(STORAGE_KEY)).toBe(original)
  expect(meldungsText()).toContain('kanban-vorlage')
})

test('Maskenname und Rahmennummer ueberstehen den Weg durch den Speicher', () => {
  const tree = {
    ...wurzelBaum(['t1']),
    [WURZEL_ID]: {
      id: WURZEL_ID,
      typ: WURZEL_TYP,
      werte: { maskenName: 'Belegerfassung', belegRahmen: '00001' },
      elternId: null,
      kinderIds: ['t1'],
    },
    t1: { id: 't1', typ: 'text', werte: {}, elternId: WURZEL_ID, kinderIds: [] },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId: null,
    datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  const geladen = loadFromStorage()
  expect(geladen?.tree[WURZEL_ID]?.werte).toEqual({
    maskenName: 'Belegerfassung',
    belegRahmen: '00001',
  })
  expect(meldungsText()).toBe('')
})

// Eine Angabe an der Maske selbst darf nicht stillschweigend verschwinden: die
// Maskendatei wird gar nicht geladen und nennt die Stelle, sonst faende der
// Bediener den Verlust erst in SoftEngine.
test('eine unbekannte Angabe an der Maske laesst die Datei stehen und sagt es', () => {
  const mitProp = (werte: Record<string, unknown>) => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte, elternId: null, kinderIds: ['t1'] },
      t1: { id: 't1', typ: 'text', werte: {}, elternId: WURZEL_ID, kinderIds: [] },
    },
  })

  const heil = pruefeBaumStand(mitProp({ maskenName: 'Maske', belegRahmen: '00001' }))
  expect(heil.art).toBe('ok')

  const fremd = pruefeBaumStand(mitProp({ maskenName: 'Maske', wasAuchImmer: 'ja' }))
  expect(fremd.art).toBe('abgelehnt')
  expect(fremd.art === 'abgelehnt' && fremd.probleme[0]?.grund)
    .toContain('an der Maske selbst stimmen Angaben nicht')
})

test('ein entfernter Container wird nicht mehr still aufgeloest', () => {
  const tree = {
    ...wurzelBaum(['z1']),
    z1: { id: 'z1', typ: 'zeile', werte: {}, elternId: WURZEL_ID, kinderIds: ['t1'] },
    t1: { id: 't1', typ: 'text', werte: {}, elternId: 'z1', kinderIds: [] },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId: null,
    datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  const original = speicher.getItem(STORAGE_KEY)
  expect(loadFromStorage()).toBeNull()
  expect(speicher.getItem(STORAGE_KEY)).toBe(original)
  expect(meldungsText()).toContain('zeile')
})

test('alte Rasterformate werden gesichert und ohne Konvertierung abgelehnt', () => {
  const tree = {
    ...wurzelBaum(['t1', 'b1']),
    t1: {
      id: 't1', typ: 'tabelle', elternId: WURZEL_ID, kinderIds: [],
      werte: { rasterX: 0, rasterY: 3, rasterW: 24, rasterH: 14 },
    },
    b1: {
      id: 'b1', typ: 'button', elternId: WURZEL_ID, kinderIds: [],
      werte: { rasterX: 20, rasterY: 0, rasterW: 4, rasterH: 2 },
    },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 6, tree, selectedId: null }))

  const original = speicher.getItem(STORAGE_KEY)
  expect(loadFromStorage()).toBeNull()
  expect(speicher.getItem(STORAGE_KEY)).toBe(original)
  expect(kopien(STORAGE_KEY).map((k) => speicher.getItem(k))).toEqual([original])
})

test('ein Stand im feinen Raster wird nicht noch einmal verdoppelt', () => {
  const props = { rasterX: 40, rasterY: 0, rasterW: 8, rasterH: 2 }
  const tree = {
    ...wurzelBaum(['b1']),
    b1: { id: 'b1', typ: 'button', elternId: WURZEL_ID, kinderIds: [], werte: props },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId: null,
    datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  expect(loadFromStorage()?.tree.b1?.werte).toMatchObject(props)
})

test('ein unlesbarer Bibliothekseintrag verhindert einen gekuerzten Maskenstand', () => {
  const roh = JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree: wurzelBaum([]), selectedId: null,
    datenquellen: [{ name: 'ohne Kennung' }], relationen: [], activePageId: WURZEL_ID,
  })
  speicher.setItem(STORAGE_KEY, roh)

  expect(loadFromStorage()).toBeNull()
  expect(speicher.getItem(STORAGE_KEY)).toBe(roh)
  expect(kopien(STORAGE_KEY).map((k) => speicher.getItem(k))).toEqual([roh])
})

test('ein Stand im Format 10 wird beim Laden auf die deutschen Bausteinnamen gehoben', () => {
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: 10,
    tree: {
      [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['t1'] },
      t1: {
        id: 't1', typ: 'tabelle', werte: { source: 'q1', tagField: '5_8' }, elternId: WURZEL_ID, kinderIds: [],
        ketten: { onRowClick: [{ id: 's1', art: 'BW_LINK', ergebnisName: '', befehl: '0,REFRESH' }] },
      },
    },
    datenquellen: [], relationen: [],
  }))
  const stand = loadFromStorage()
  expect(stand?.tree.t1.werte).toMatchObject({ quelle: 'q1', tagFeld: '5_8' })
  expect(stand?.tree.t1.ketten?.zeileGewaehlt).toHaveLength(1)
  expect(meldungsText()).toBe('')
})

// Der Stand des Nutzers vom 15.09.: der Editor schrieb in jeden Ketten-Parameter
// `wert` UND `value`. Im heutigen Format hebt keine Umstellung das Doppel mehr
// weg, und der Lader verwarf die ganze Maske — dem Nutzer ging sie zehnmal
// verloren. Darum steht hier das heutige Format, nicht das alte.
test('ein Ketten-Parameter mit altem value neben wert laedt ohne Verlust', () => {
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      ...wurzelBaum(['b1']),
      b1: {
        id: 'b1', typ: 'button', werte: {}, elternId: WURZEL_ID, kinderIds: [],
        ketten: { onClick: [{
          id: 's1', art: 'RELATION', ergebnisName: '', relationId: 'r1', zusatzParameter: [],
          parameter: [{ quelle: 'fixed', wert: 'R', value: 'R' }, { quelle: 'data_field', wert: '3_8', quelleId: 'q1', value: '3_8' }],
        }] },
      },
    },
    datenquellen: [], relationen: [],
  }))
  const stand = loadFromStorage()
  expect(stand?.tree.b1.ketten?.onClick[0]).toMatchObject({
    parameter: [{ quelle: 'fixed', wert: 'R' }, { quelle: 'data_field', wert: '3_8', quelleId: 'q1' }],
  })
  expect(meldungsText()).toBe('')
})

test('ein Stand im Format 9 wird beim Laden auf den heutigen Stand gehoben', () => {
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: 9,
    tree: {
      [WURZEL_ID]: { id: WURZEL_ID, type: WURZEL_TYP, props: {}, parentId: null, childIds: ['b1'] },
      b1: {
        id: 'b1', type: 'button', props: {}, parentId: WURZEL_ID, childIds: [],
        events: { onClick: [{
          id: 's1', type: 'RELATION', resultKey: '', relationId: 'r1',
          params: [{ source: 'data_field', value: '3_8', dataSourceId: 'q1' }], extraParams: [],
        }] },
      },
    },
    datenquellen: [{ id: 'q1', name: 'Beleg', kind: 'beleg', indexField: '0_11', fields: [{ code: '3_8', label: 'Nummer' }] }],
    relationen: [{ id: 'r1', name: 'Lesen', verb: 'GET_RELATION', nr: '69', params: ['{PINDEX}'], allowExtraParams: false }],
  }))
  const stand = loadFromStorage()
  expect(stand).not.toBeNull()
  expect(stand?.tree.b1.typ).toBe('button')
  expect(stand?.tree.b1.ketten?.onClick[0]).toMatchObject({
    art: 'RELATION', parameter: [{ quelle: 'data_field', wert: '3_8', quelleId: 'q1' }],
  })
  expect(stand?.datenquellen[0]).toMatchObject({ art: 'beleg', satzFeld: '0_11', felder: [{ code: '3_8', name: 'Nummer' }] })
  expect(stand?.relationen[0]).toMatchObject({ parameter: ['{PINDEX}'], zusatzParameterErlaubt: false })
  expect(kopien(STORAGE_KEY)).toHaveLength(0)
  expect(meldungsText()).toBe('')
})

// Die Marke am getippten Spaltentitel ist neu. Eine Maske, die sie traegt, und
// eine aeltere ohne sie muessen beide laden: ein neuer Schluessel darf keinen
// gespeicherten Stand kosten.
test('eine Maske mit und eine ohne die Marke am Spaltentitel laden beide', () => {
  const maske = (spalte: Record<string, unknown>): string => JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      ...wurzelBaum(['t1']),
      t1: { id: 't1', typ: 'tabelle', werte: { spalten: [spalte] }, elternId: WURZEL_ID, kinderIds: [] },
    },
    selectedId: null, datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  })

  const mitMarke = { kennung: 's1', titel: 'Menge', feld: '3_8', titelVonHand: true }
  speicher.setItem(STORAGE_KEY, maske(mitMarke))
  expect(loadFromStorage()?.tree.t1.werte.spalten).toEqual([mitMarke])

  const ohneMarke = { kennung: 's1', titel: 'Menge', feld: '3_8' }
  speicher.setItem(STORAGE_KEY, maske(ohneMarke))
  expect(loadFromStorage()?.tree.t1.werte.spalten).toEqual([ohneMarke])

  expect(meldungsText()).toBe('')
  expect(kopien(STORAGE_KEY)).toHaveLength(0)
})

// Das Formularfeld heisst seine Angaben deutsch. Eine Maske von gestern traegt
// noch fieldType, placeholder, options, value und valueField; ohne Hebung
// verwuerfe der Lader sie samt allem, was daneben steht.
test('ein Formularfeld aus Format 11 laedt mit den deutschen Namen', () => {
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: 11,
    tree: {
      ...wurzelBaum(['f1']),
      f1: {
        id: 'f1', typ: 'formfeld', elternId: WURZEL_ID, kinderIds: [],
        werte: {
          fieldType: 'nachschlagen', placeholder: 'Artikel', options: 'A, B',
          value: 'X', valueField: '45_60', quelle: 'q1',
          nachschlagQuelle: 'q2', speicherFeld: 'nr', fensterBreite: 700,
        },
      },
    },
    datenquellen: [], relationen: [],
  }))

  const werte = loadFromStorage()?.tree.f1.werte
  expect(werte).toMatchObject({
    feldTyp: 'nachschlagen', beschriftung: 'Artikel', optionen: 'A, B',
    wert: 'X', wertField: '45_60', quelle: 'q1',
    nachschlagQuelle: 'q2', speicherFeld: 'nr', fensterBreite: 700,
  })
  expect(Object.keys(werte ?? {})).not.toContain('fieldType')
  expect(meldungsText()).toBe('')
  expect(kopien(STORAGE_KEY)).toHaveLength(0)
})

test('die juengste Notfallkopie wird gefunden', () => {
  speicher.setItem(backupKeyFor(STORAGE_KEY) + '_2026-09-15T08-00-00-000Z', 'alt')
  speicher.setItem(backupKeyFor(STORAGE_KEY) + '_2026-09-15T09-00-00-000Z', 'neu')
  expect(letzteKopie(STORAGE_KEY)?.raw).toBe('neu')
})

test('ein entfallener Bausteintyp faellt weg, der Rest wird geladen und es wird gesagt', () => {
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['n1', 'a1', 't1'] },
      n1: { id: 'n1', typ: 'navi', werte: {}, elternId: WURZEL_ID, kinderIds: ['ne1'] },
      ne1: { id: 'ne1', typ: 'navi-eintrag', werte: {}, elternId: 'n1', kinderIds: [] },
      a1: { id: 'a1', typ: 'ansicht', werte: { name: 'Zweite Seite' }, elternId: WURZEL_ID, kinderIds: ['t2'] },
      t2: { id: 't2', typ: 'text', werte: {}, elternId: 'a1', kinderIds: [] },
      t1: { id: 't1', typ: 'text', werte: {}, elternId: WURZEL_ID, kinderIds: [] },
    },
    datenquellen: [],
    relationen: [],
  }))
  const stand = loadFromStorage()
  expect(Object.keys(stand?.tree ?? {}).sort()).toEqual([WURZEL_ID, 't1'])
  expect(stand?.tree[WURZEL_ID].kinderIds).toEqual(['t1'])
  expect(meldungsText()).toContain('„navi"')
  expect(meldungsText()).toContain('„ansicht"')
  expect(kopien(STORAGE_KEY)).toHaveLength(0)
})

// Die Erfassung ist ein eigener Baustein geworden und erbt nicht mehr von der
// Tabelle. In der Datei heisst sie weiter „erfassung", und keine ihrer Angaben
// wurde umbenannt: eine Maske von gestern muss Spalte fuer Spalte wiederkommen.
test('eine gespeicherte Erfassung laedt mit allen ihren Angaben', () => {
  const werte = {
    quelle: 'q1',
    spalten: [{
      kennung: 's1', titel: 'Menge', feld: '164_8',
      fuellFeld: 'q-art::menge', aenderbar: false, fensterBreite: 600,
      fensterSpalten: [{ kennung: 'f1', titel: 'Nummer', feld: 'nr' }],
    }],
    loeschbar: 'ja',
    berechnungen: [{ kennung: 'b1', name: 'Doppelt' }],
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      ...wurzelBaum(['e1']),
      e1: { id: 'e1', typ: 'erfassung', werte, elternId: WURZEL_ID, kinderIds: [] },
    },
    selectedId: null, datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  // toMatchObject: der Lader legt die Vorgaben des Bausteins dazu. Zaehlen
  // soll, dass nichts Gespeichertes verlorengeht.
  expect(loadFromStorage()?.tree.e1.werte).toMatchObject(werte)
  expect(meldungsText()).toBe('')
  expect(kopien(STORAGE_KEY)).toHaveLength(0)
})
