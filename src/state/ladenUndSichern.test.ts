import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../blocks/register'
import { WURZEL_ID, WURZEL_TYP } from '../core/blocks/BlockData'
import { meldungen } from './meldungen'
import { CURRENT_SCHEMA_VERSION } from './maskenSchema'
import { pruefeBaumStand } from './ladeKette'
import { backupKeyFor } from './notfallkopie'
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
    [WURZEL_ID]: { id: WURZEL_ID, type: WURZEL_TYP, props: {}, parentId: null, childIds: kinder },
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
    kb: { id: 'kb', type: 'kanban', props: {}, parentId: WURZEL_ID, childIds: ['vor'] },
    vor: { id: 'vor', type: 'kanban-vorlage', props: {}, parentId: 'kb', childIds: ['c1', 'c2'] },
    c1: { id: 'c1', type: 'card', props: {}, parentId: 'vor', childIds: [] },
    c2: { id: 'c2', type: 'card', props: {}, parentId: 'vor', childIds: [] },
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
      type: WURZEL_TYP,
      props: { maskenName: 'Belegerfassung', belegRahmen: '00001' },
      parentId: null,
      childIds: ['t1'],
    },
    t1: { id: 't1', type: 'text', props: {}, parentId: WURZEL_ID, childIds: [] },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId: null,
    datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  const geladen = loadFromStorage()
  expect(geladen?.tree[WURZEL_ID]?.props).toEqual({
    maskenName: 'Belegerfassung',
    belegRahmen: '00001',
  })
  expect(meldungsText()).toBe('')
})

// Eine Angabe an der Maske selbst darf nicht stillschweigend verschwinden: die
// Maskendatei wird gar nicht geladen und nennt die Stelle, sonst faende der
// Bediener den Verlust erst in SoftEngine.
test('eine unbekannte Angabe an der Maske laesst die Datei stehen und sagt es', () => {
  const mitProp = (props: Record<string, unknown>) => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      [WURZEL_ID]: { id: WURZEL_ID, type: WURZEL_TYP, props, parentId: null, childIds: ['t1'] },
      t1: { id: 't1', type: 'text', props: {}, parentId: WURZEL_ID, childIds: [] },
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
    z1: { id: 'z1', type: 'zeile', props: {}, parentId: WURZEL_ID, childIds: ['t1'] },
    t1: { id: 't1', type: 'text', props: {}, parentId: 'z1', childIds: [] },
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
      id: 't1', type: 'tabelle', parentId: WURZEL_ID, childIds: [],
      props: { rasterX: 0, rasterY: 3, rasterW: 24, rasterH: 14 },
    },
    b1: {
      id: 'b1', type: 'button', parentId: WURZEL_ID, childIds: [],
      props: { rasterX: 20, rasterY: 0, rasterW: 4, rasterH: 2 },
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
    b1: { id: 'b1', type: 'button', parentId: WURZEL_ID, childIds: [], props },
  }
  speicher.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId: null,
    datenquellen: [], relationen: [], activePageId: WURZEL_ID,
  }))

  expect(loadFromStorage()?.tree.b1?.props).toMatchObject(props)
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

test('eine Formel aus Schema 8 wird zur Berechnung mit der Spalte als Leitgroesse', () => {
  const tree = {
    ...wurzelBaum(['t1']),
    t1: {
      id: 't1', type: 'erfassung', parentId: WURZEL_ID, childIds: [],
      props: {
        rasterX: 0, rasterY: 0, rasterW: 16, rasterH: 10,
        spalten: [
          { kennung: 's1', titel: 'Menge', feld: '164_8' },
          { kennung: 's2', titel: 'Doppelt', feld: '', formel: { glieder: [{ spalte: 's1' }, { zahl: 2 }], zeichen: ['*'], runden: { stellen: 2, richtung: 'kfm' } } },
        ],
      },
    },
  }
  const stand = pruefeBaumStand({ schemaVersion: 8, tree })
  expect(stand.art).toBe('ok')
  if (stand.art !== 'ok') return
  const props = stand.baum.tree.t1.props as { spalten: Record<string, unknown>[]; berechnungen: Record<string, unknown>[] }
  expect(props.spalten[1]).not.toHaveProperty('formel')
  expect(props.berechnungen).toHaveLength(1)
  expect(props.berechnungen[0]).toMatchObject({
    name: 'Doppelt',
    leit: { spalte: 's2', ergebnis: true, runden: { stellen: 2 } },
    zaehler: [{ art: 'spalte', spalte: 's1', ergebnis: false }, { art: 'zahl', zahl: 2 }],
  })
})

test('eine Formel mit Plus aus Schema 8 wird als benannter Verlust abgelehnt', () => {
  const tree = {
    ...wurzelBaum(['t1']),
    t1: {
      id: 't1', type: 'erfassung', parentId: WURZEL_ID, childIds: [],
      props: {
        spalten: [
          { kennung: 's1', titel: 'A', feld: '' },
          { kennung: 's2', titel: 'Summe', feld: '', formel: { glieder: [{ spalte: 's1' }, { zahl: 1 }], zeichen: ['+'], runden: { stellen: 2, richtung: 'kfm' } } },
        ],
      },
    },
  }
  const stand = pruefeBaumStand({ schemaVersion: 8, tree })
  expect(stand.art).toBe('abgelehnt')
  if (stand.art !== 'abgelehnt') return
  expect(stand.probleme[0]?.grund).toContain('Summe')
})
