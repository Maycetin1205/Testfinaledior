import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../../bausteine/anmeldung'
import type { Datenquelle } from '../../kern/daten/datenquellen'
import type { RelationsVorlage } from '../../kern/daten/relationen'
import { BIBLIOTHEK_DATEI_ART, ladeBibliothekAusDatei } from './bibliothekDatei'
import { leererBaum } from '../../kern/maske/baumOps'
import { Editor } from './Editor'
import { ladeMaskeAusDatei } from './maskenDatei'
import { meldungen } from './meldungen'

// Hier haengt, dass eine geladene Bibliothek nur ergaenzt: was im Editor steht
// und nicht in der Datei, darf nicht verschwinden.

class SpeicherStub {
  readonly daten = new Map<string, string>()
  get length(): number { return this.daten.size }
  key(i: number): string | null { return [...this.daten.keys()][i] ?? null }
  getItem(k: string): string | null { return this.daten.get(k) ?? null }
  setItem(k: string, v: string): void { this.daten.set(k, v) }
  removeItem(k: string): void { this.daten.delete(k) }
  clear(): void { this.daten.clear() }
}

const QUELLE_A: Datenquelle = {
  id: 'q-a', name: 'Artikel', kind: 'idb', idbId: 'IDB0001', fields: [{ code: '3_8', label: 'Nummer' }],
}
const QUELLE_B: Datenquelle = {
  id: 'q-b', name: 'Chargen', kind: 'idb', idbId: 'IDB0002', fields: [],
}
const REL_NEU: RelationsVorlage = {
  id: 'r-neu', name: 'Position holen', verb: 'GET_RELATION', nr: '640', params: ['{PINDEX}'],
}

function bibliothek(datenquellen: unknown[], relationen: unknown[]): File {
  return new File(
    [JSON.stringify({ art: BIBLIOTHEK_DATEI_ART, dateiVersion: 1, datenquellen, relationen })],
    'bibliothek.json',
    { type: 'application/json' },
  )
}

function meldungsText(): string {
  return meldungen.liste.map((m) => m.text).join('\n---\n')
}

let ed: Editor

beforeEach(() => {
  vi.stubGlobal('localStorage', new SpeicherStub())
  meldungen.leere()
  ed = new Editor({ tree: leererBaum(), datenquellen: [QUELLE_A], relationen: [{
    id: 'standard-put', name: 'Standard-Schreiben (PUT)', verb: 'PUT_RELATION', nr: '174', params: ['{VALUE}'],
  }] })
})

afterEach(() => {
  vi.unstubAllGlobals()
  meldungen.leere()
})

test('Laden ergaenzt nach Kennung und loescht nichts', async () => {
  const geaendert = { ...QUELLE_A, name: 'Artikelstamm' }
  await ladeBibliothekAusDatei(ed, bibliothek([geaendert, QUELLE_B], [REL_NEU]))

  expect(ed.datenquellen.list.map((q) => q.id)).toEqual(['q-a', 'q-b'])
  expect(ed.datenquellen.get('q-a')?.name).toBe('Artikelstamm')
  expect(ed.relationen.list.map((r) => r.id)).toEqual(['standard-put', 'r-neu'])
  expect(meldungsText()).toContain('Datenquellen: 1 neu, 1 aktualisiert')
  expect(meldungsText()).toContain('Relationen: 1 neu')
})

test('dieselbe Datei ein zweites Mal aendert nichts und legt keinen Undo-Schritt an', async () => {
  await ladeBibliothekAusDatei(ed, bibliothek([QUELLE_B], []))
  ed.speichereJetzt()
  meldungen.leere()
  const zweiter = new Editor()
  const stand = zweiter.datenquellen.version

  await ladeBibliothekAusDatei(zweiter, bibliothek([QUELLE_B], []))

  expect(zweiter.datenquellen.version).toBe(stand)
  expect(zweiter.canUndo).toBe(false)
  expect(meldungsText()).toContain('nichts geändert')
})

test('Strg+Z nimmt beide Bibliotheken in einem Schritt zurueck', async () => {
  await ladeBibliothekAusDatei(ed, bibliothek([QUELLE_B], [REL_NEU]))
  expect(ed.datenquellen.list).toHaveLength(2)

  ed.undo()

  expect(ed.datenquellen.list.map((q) => q.id)).toEqual(['q-a'])
  expect(ed.relationen.list.map((r) => r.id)).toEqual(['standard-put'])
  expect(ed.canUndo).toBe(false)
})

test('eine beschaedigte Bibliotheksdatei laedt auch ihren heilen Teil nicht', async () => {
  await ladeBibliothekAusDatei(ed, bibliothek([QUELLE_B, { id: 'q-c', name: 'Ohne Art' }], []))

  expect(ed.datenquellen.list.map((q) => q.id)).toEqual(['q-a'])
  expect(meldungsText()).toContain('beschädigt')
  expect(meldungsText()).toContain('die Art der Datenquelle fehlt oder ist unbekannt')
})

test('Maskendatei und Bibliotheksdatei zeigen aufeinander statt still zu scheitern', async () => {
  const maske = new File(
    [JSON.stringify({ art: 'aufbau-editor-maske', dateiVersion: 2, schemaVersion: 1, tree: {} })],
    'maske.json',
  )
  await ladeBibliothekAusDatei(ed, maske)
  expect(meldungsText()).toContain('Maske laden')

  meldungen.leere()
  await ladeMaskeAusDatei(ed, bibliothek([], []))
  expect(meldungsText()).toContain('Bibliothek laden')
  expect(ed.datenquellen.list.map((q) => q.id)).toEqual(['q-a'])
})

test('die Spaltenbreite am Feld uebersteht den Weg durch die Datei', async () => {
  await ladeBibliothekAusDatei(ed, bibliothek([{
    ...QUELLE_B,
    fields: [
      { code: '3_8', label: 'Nummer', zeichen: 8 },
      { code: '45_60', label: 'Bezeichnung' },
    ],
  }], []))

  const felder = ed.datenquellen.list.find((q) => q.id === 'q-b')?.fields ?? []
  expect(felder.map((f) => f.zeichen)).toEqual([8, undefined])
})

// Eine unmoegliche Breite wird NICHT stillschweigend weggeworfen: der Lader
// nennt die Stelle und laedt gar nicht, sonst faende der Bediener den Verlust nie.
test('eine unmoegliche Spaltenbreite laesst die Datei stehen und sagt wo', async () => {
  await ladeBibliothekAusDatei(ed, bibliothek([{
    ...QUELLE_B,
    fields: [{ code: '3_8', label: 'Nummer', zeichen: 0 }],
  }], []))

  expect(ed.datenquellen.list.map((q) => q.id)).toEqual(['q-a'])
  expect(meldungsText()).toContain('zeichen')
})
