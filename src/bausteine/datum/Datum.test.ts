// Der Vertrag des Datums mit Export, Maske und altem Maskenstand: der gewaehlte
// Tag gehoert der Maske, der Waehler traegt ihn nur vor und zurueck.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { exportMask } from '../../export/exportMask'
import { laufzeitTeileFuer } from '../../export/laufzeitTeile'
import { pruefeBaumStand } from '../../editor/zustand/ladeKette'
import { CURRENT_SCHEMA_VERSION, hebeStand } from '../../editor/zustand/maskenSchema'
import { Datum } from './Datum'

// Was der Export an JEDEN Baustein schreibt: Platz im Raster und Fuellung.
const LAYOUT_ATTRIBUTE = new Set(['style', 'fuellt', 'data-ff-hauptinhalt'])

interface Waehler extends HTMLElement {
  updateComplete: Promise<boolean>
}

function maskeMitDatum(werte: Record<string, unknown> = {}): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['d1'] },
    d1: {
      id: 'd1',
      typ: Datum.typ,
      werte: { rasterX: 0, rasterY: 0, rasterW: 18, rasterH: 3, ...werte },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

function datumTag(werte: Record<string, unknown> = {}): string {
  const { html } = exportMask(maskeMitDatum(werte), 'Test', [], [])
  return /<ff-datum[^>]*>/.exec(html)?.[0] ?? ''
}

function attributNamen(tag: string): string[] {
  return tag
    .replace(/="[^"]*"/g, '')
    .replace(/^<ff-datum|>$/g, '')
    .trim()
    .split(/\s+/)
    .filter((name) => name !== '')
}

test('das Datum meldet sich ohne eigene Eigenschaft und ohne Faehigkeit an', () => {
  const art = bausteinArt(Datum.typ)
  expect(art?.tag).toBe('ff-datum')
  expect(Object.keys(Datum.vorgaben)).toEqual([])
  expect(Datum.eigenschaften).toEqual([])
  expect(art?.faehigkeiten ?? []).toEqual([])
})

// Der Tag ist kein Maskeninhalt: er steht in keinem Attribut, und keine Maske
// legt fest, an welchem Tag sie aufgeht.
test('der gewaehlte Tag erreicht keinen Export', () => {
  const tag = datumTag()
  expect(attributNamen(tag)).toContain('style')
  expect(attributNamen(tag).filter((name) => !LAYOUT_ATTRIBUTE.has(name))).toEqual([])
})

// Der Tag gehoert der Maske, also bleibt er eine Faehigkeit; im Baustein zoege
// ihn jede Tabelle mit Tagesfilter aus einem Baustein.
test('eine Maske mit Datum traegt die Faehigkeit Gewaehlter Tag und keine Datentuer', () => {
  const teile = laufzeitTeileFuer(new Set([Datum.typ])).map((teil) => teil.name)
  expect(teile).toContain('faehigkeit-gewaehlterTag')
  expect(teile).not.toContain('faehigkeit-quelle')
  expect(teile.filter((name) => name.startsWith('bruecke-'))).toEqual([])
})

test('eine alte Maske mit Datum laedt weiter', () => {
  const alt = { schemaVersion: 11, tree: maskeMitDatum({ width: 'fill' }) }
  const gehoben = hebeStand(alt) as { schemaVersion: number; tree: Record<string, unknown> }
  expect(gehoben.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

  const stand = pruefeBaumStand(gehoben as never)
  expect(stand.art, stand.art === 'abgelehnt' ? stand.probleme[0]?.grund : '').toBe('ok')
  expect(stand.art === 'ok' && stand.baum.tree.d1.typ).toBe(Datum.typ)
  expect(stand.art === 'ok' && stand.baum.tree.d1.werte.width).toBe('fill')
})

async function tageImBrowser(): Promise<string[]> {
  const { html } = exportMask(maskeMitDatum(), 'Datumsmaske', [], [])
  const ablage = path.resolve('node_modules/.tmp/datum-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'datum.html')
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(500)
    return await seite.evaluate(async () => {
      const el = document.querySelector('ff-datum') as Waehler
      const wurzel = el.shadowRoot as ShadowRoot
      const feld = wurzel.querySelector('input.feld') as HTMLInputElement
      const druecke = (auswahl: string): void => { (wurzel.querySelector(auswahl) as HTMLButtonElement).click() }
      const stand = async (): Promise<string> => { await el.updateComplete; return feld.value }
      const jetzt = new Date()

      feld.value = '2026-03-01'
      feld.dispatchEvent(new Event('change'))
      const gesetzt = await stand()
      druecke('.pfeil[title="Vortag"]')
      const vortag = await stand()
      druecke('.pfeil[title="Folgetag"]')
      druecke('.pfeil[title="Folgetag"]')
      const folgetag = await stand()
      druecke('.heute')
      return [gesetzt, vortag, folgetag, await stand(), [
        jetzt.getFullYear(),
        String(jetzt.getMonth() + 1).padStart(2, '0'),
        String(jetzt.getDate()).padStart(2, '0'),
      ].join('-')]
    })
  } finally {
    await browser.close()
  }
}

// Der Monatswechsel rechnet in Tagen, nicht in Ziffern: aus dem 1. Maerz wird
// rueckwaerts der 28. Februar.
test('Vortag, Folgetag und Heute setzen den Tag der Maske', async () => {
  const [gesetzt, vortag, folgetag, heute, erwartetHeute] = await tageImBrowser()
  expect(gesetzt).toBe('2026-03-01')
  expect(vortag).toBe('2026-02-28')
  expect(folgetag).toBe('2026-03-02')
  expect(heute).toBe(erwartetHeute)
}, 60_000)
