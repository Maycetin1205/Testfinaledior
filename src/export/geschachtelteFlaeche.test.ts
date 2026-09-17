// Beweist: ein Kind in einer geschachtelten Rasterflaeche bekommt seinen
// Rasterplatz — im Editor und im Export.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../bausteine/anmeldung'
import { leererBaum } from '../kern/maske/baumOps'
import { FLUSS_VORGABEN } from '../kern/maske/fluss'
import { RASTER_VORGABEN } from '../kern/maske/raster'
import { istRasterFlaeche } from '../kern/maske/rasterFlaeche'
import { bausteinArt, meldeBausteinArt } from '../kern/maske/registry'
import { Editor } from '../editor/zustand/Editor'
import { exportMask } from './exportMask'

// Den Baustein Bereich gibt es noch nicht. Geprueft wird die Stelle, an der er
// haengen wird: `rasterFlaeche` an der Bausteinart, die Editor und Export
// gemeinsam fragen.
const FLAECHE_TYP = 'pruefflaeche'
const FLAECHE_TAG = 'ff-pruefflaeche'

meldeBausteinArt({
  typ: FLAECHE_TYP,
  tag: FLAECHE_TAG,
  name: 'Pruefflaeche',
  kategorie: 'layout',
  vorgaben: { ...FLUSS_VORGABEN, ...RASTER_VORGABEN },
  eigenschaften: [],
  faehigkeiten: [],
  nimmtKinder: true,
  breiteAenderbar: true,
  hoeheAenderbar: true,
  rasterFlaeche: true,
})

class SpeicherStub {
  readonly daten = new Map<string, string>()
  get length(): number { return this.daten.size }
  key(i: number): string | null { return [...this.daten.keys()][i] ?? null }
  getItem(k: string): string | null { return this.daten.get(k) ?? null }
  setItem(k: string, v: string): void { this.daten.set(k, v) }
  removeItem(k: string): void { this.daten.delete(k) }
  clear(): void { this.daten.clear() }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new SpeicherStub())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Die Zeile des Bausteins in der exportierten Maske.
function zeileMitTag(html: string, tag: string): string {
  const zeile = html.split('\n').find((z) => z.includes(`<${tag}`))
  if (zeile === undefined) throw new Error(`Der Export enthaelt kein <${tag}>`)
  return zeile
}

test('die Bausteinart entscheidet, ob ein Baustein eine Rasterflaeche ist', () => {
  const flaeche = { id: 'a', typ: FLAECHE_TYP, werte: {}, elternId: null, kinderIds: [] }
  const text = { id: 'b', typ: 'text', werte: {}, elternId: 'a', kinderIds: [] }
  expect(istRasterFlaeche(flaeche)).toBe(true)
  expect(istRasterFlaeche(text)).toBe(false)
  expect(bausteinArt('text')?.rasterFlaeche).toBeUndefined()
})

test('ein Kind in der geschachtelten Flaeche sitzt im Editor in seiner Zelle', () => {
  const editor = new Editor({ tree: leererBaum(), datenquellen: [], relationen: [] })
  const flaeche = editor.addBlock(FLAECHE_TYP)!

  const neues = editor.addBlockAtCell('text', flaeche.id, 6, 4)!
  expect(editor.getNode(neues.id)?.elternId).toBe(flaeche.id)
  expect(editor.getNode(neues.id)?.werte).toMatchObject({ rasterX: 6, rasterY: 4 })

  // Ein Baustein von der Wurzelflaeche zieht in die geschachtelte Flaeche um.
  const umzug = editor.addBlock('button')!
  editor.moveNodeToCell(umzug.id, flaeche.id, 3, 1)
  expect(editor.getNode(umzug.id)?.elternId).toBe(flaeche.id)
  expect(editor.getNode(umzug.id)?.werte).toMatchObject({ rasterX: 3, rasterY: 1 })
})

test('dasselbe Kind traegt seine Zelle in der exportierten Maske', () => {
  const editor = new Editor({ tree: leererBaum(), datenquellen: [], relationen: [] })
  const flaeche = editor.addBlock(FLAECHE_TYP)!
  editor.updateProperty(flaeche.id, 'rasterX', 2)
  editor.updateProperty(flaeche.id, 'rasterY', 8)
  editor.addBlockAtCell('text', flaeche.id, 6, 4)

  const { html } = exportMask(editor.tree, 'Pruefmaske')

  // Der Text steht in der Flaeche, nicht daneben.
  expect(html.indexOf('<ff-text')).toBeGreaterThan(html.indexOf(`<${FLAECHE_TAG}`))
  expect(html.indexOf('<ff-text')).toBeLessThan(html.indexOf(`</${FLAECHE_TAG}>`))

  // Die Flaeche selbst sitzt in der Wurzel, ihr Kind in ihr: Zelle 0 ist
  // Spalte/Zeile 1, darum 3/9 und 7/5.
  expect(zeileMitTag(html, FLAECHE_TAG)).toContain('grid-column:3 / span')
  expect(zeileMitTag(html, FLAECHE_TAG)).toContain('grid-row:9 / span')
  expect(zeileMitTag(html, 'ff-text')).toContain('grid-column:7 / span')
  expect(zeileMitTag(html, 'ff-text')).toContain('grid-row:5 / span')
})
