import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../../bausteine/anmeldung'
import { WURZEL_ID, WURZEL_TYP } from '../../kern/maske/baum'
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
