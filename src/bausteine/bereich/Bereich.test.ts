// Der Vertrag des Bereichs: er meldet sich als Rasterflaeche ohne Faehigkeit und
// ohne Einstellung an, und in der Maske ist sein Rumpf ein Raster ohne Kopfzeile.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt, darfEnthalten } from '../../kern/maske/registry'
import { istRasterFlaeche } from '../../kern/maske/rasterFlaeche'
import { exportMask } from '../../export/exportMask'
import { CURRENT_SCHEMA_VERSION, hebeStand } from '../../editor/zustand/maskenSchema'
import { pruefeBaumStand } from '../../editor/zustand/ladeKette'
import { Bereich } from './Bereich'

// Ein Kasten mit einem Kind, ein leerer daneben.
function bereichMaske(): Maskenbaum {
  return {
    [WURZEL_ID]: {
      id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['b1', 'b2'],
    },
    b1: {
      id: 'b1',
      typ: Bereich.typ,
      werte: { rasterX: 2, rasterY: 8, rasterW: 24, rasterH: 12 },
      elternId: WURZEL_ID,
      kinderIds: ['t1'],
    },
    t1: {
      id: 't1',
      typ: 'text',
      werte: { rasterX: 6, rasterY: 4, rasterW: 10, rasterH: 1, text: 'Im Bereich' },
      elternId: 'b1',
      kinderIds: [],
    },
    b2: {
      id: 'b2',
      typ: Bereich.typ,
      werte: { rasterX: 2, rasterY: 22, rasterW: 24, rasterH: 6 },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

function zeileMitTag(html: string, tag: string): string {
  const zeile = html.split('\n').find((z) => z.includes(`<${tag}`))
  if (zeile === undefined) throw new Error(`Der Export enthaelt kein <${tag}>`)
  return zeile
}

test('der Bereich meldet sich als Rasterflaeche an, ohne Faehigkeit und ohne Einstellung', () => {
  const art = bausteinArt(Bereich.typ)
  expect(art?.tag).toBe('ff-bereich')
  expect(art?.kategorie).toBe('layout')
  expect(art?.nimmtKinder).toBe(true)
  expect(art?.rasterFlaeche).toBe(true)
  // Den Rahmen zeichnet der Baustein, nicht der Editor-Wirt.
  expect(art?.behaelterRahmen).toBe(false)
  expect(Bereich.faehigkeiten).toEqual([])
  expect(art?.faehigkeiten).toEqual([])
  expect(Object.keys(Bereich.vorgaben)).toEqual([])
  expect(art?.eigenschaften).toEqual([])

  const kasten = { id: 'b', typ: Bereich.typ, werte: {}, elternId: WURZEL_ID, kinderIds: [] }
  expect(istRasterFlaeche(kasten)).toBe(true)
  // Bereich im Bereich: kein erlaubteKinder, kein erlaubteEltern.
  expect(darfEnthalten(Bereich.typ, Bereich.typ)).toBe(true)
  expect(darfEnthalten(Bereich.typ, 'formfeld')).toBe(true)
})

test('das Kind steht im Bereich und traegt dort seine Zelle', () => {
  const { html } = exportMask(bereichMaske(), 'Bereichsmaske')

  expect(html.indexOf('<ff-text')).toBeGreaterThan(html.indexOf('<ff-bereich'))
  expect(html.indexOf('<ff-text')).toBeLessThan(html.indexOf('</ff-bereich>'))

  // Zelle 0 ist Spalte/Zeile 1: der Kasten steht auf 3/9, sein Kind auf 7/5.
  expect(zeileMitTag(html, 'ff-bereich')).toContain('grid-column:3 / span 24')
  expect(zeileMitTag(html, 'ff-bereich')).toContain('grid-row:9 / span 12')
  expect(zeileMitTag(html, 'ff-text')).toContain('grid-column:7 / span 10')
  expect(zeileMitTag(html, 'ff-text')).toContain('grid-row:5 / span 1')

  // Der Kasten selbst hat nichts zu sagen: am Element steht nur, was der
  // Export jedem Baustein mitgibt.
  const attribute = /<ff-bereich([^>]*)>/.exec(zeileMitTag(html, 'ff-bereich'))?.[1] ?? ''
  expect(attribute.replace(/style="[^"]*"/, '').trim().split(/\s+/).filter(Boolean))
    .toEqual(['data-ff-hauptinhalt', 'fuellt'])
})

// Der Bereich hatte einen Tag lang eine Titelzeile. Ein Editor, der waehrend
// des Umbaus offen stand, sicherte ihre Schluessel mit.
test('eine Maske mit dem alten Bereichstitel laedt weiter', () => {
  const alt = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: {
      [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['b1'] },
      b1: {
        id: 'b1',
        typ: Bereich.typ,
        werte: { rasterX: 0, rasterY: 0, rasterW: 24, rasterH: 12, titel: 'Stammdaten', titelZeigen: 'ja' },
        elternId: WURZEL_ID,
        kinderIds: [],
      },
    },
  }

  const gehoben = hebeStand(alt) as { schemaVersion: number }
  expect(gehoben.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

  const stand = pruefeBaumStand(gehoben as never)
  expect(stand.art, stand.art === 'abgelehnt' ? stand.probleme[0]?.grund : '').toBe('ok')
  expect(stand.art === 'ok' && 'titel' in stand.baum.tree.b1.werte).toBe(false)
})

interface Kastenbild {
  hatKopf: boolean
  eigenerText: string
  rumpfAnzeige: string
  rumpfUeberlauf: string
  rumpfRahmen: string
  kindSpalte: string
  kindZeile: string
}

// Laeuft IM Browser: nur was dort gerechnet wird, zaehlt hier.
function kastenbilder(): (Kastenbild | null)[] {
  return [...document.querySelectorAll('ff-bereich')].map((el) => {
    const rumpf = el.shadowRoot?.querySelector('.rumpf')
    if (!rumpf) return null
    const kind = el.querySelector('ff-text')
    const kindStil = kind ? getComputedStyle(kind) : null
    const gerechnet = getComputedStyle(rumpf)
    return {
      hatKopf: el.shadowRoot?.querySelector('.kopf') !== null,
      // Der Kasten schreibt nichts Eigenes; jeder Text kaeme aus einem Kopf.
      eigenerText: (el.shadowRoot?.textContent ?? '').trim(),
      rumpfAnzeige: gerechnet.display,
      rumpfUeberlauf: gerechnet.overflow,
      rumpfRahmen: gerechnet.borderTopStyle,
      kindSpalte: kindStil?.gridColumnStart ?? '',
      kindZeile: kindStil?.gridRowStart ?? '',
    }
  })
}

async function kastenLaufImBrowser(): Promise<(Kastenbild | null)[]> {
  const { html } = exportMask(bereichMaske(), 'Bereichsmaske')
  const ablage = path.resolve('node_modules/.tmp/bereich-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'bereich.html')
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(500)
    return await seite.evaluate(kastenbilder)
  } finally {
    await browser.close()
  }
}

test('die Maske zeichnet den Rahmen ohne Kopfzeile und setzt das Kind in seine Zelle', async () => {
  const [mitKind, leer] = await kastenLaufImBrowser()

  expect(mitKind?.hatKopf).toBe(false)
  expect(mitKind?.eigenerText).toBe('')
  expect(mitKind?.rumpfRahmen).toBe('solid')
  // Kein Rollbalken: der Kasten zeigt, was in ihn passt.
  expect(mitKind?.rumpfUeberlauf).toBe('clip')
  // Ohne Raster im Rumpf stapelten sich die Kinder, statt in Zellen zu sitzen.
  expect(mitKind?.rumpfAnzeige).toBe('grid')
  expect(mitKind?.kindSpalte).toBe('7')
  expect(mitKind?.kindZeile).toBe('5')

  expect(leer?.hatKopf).toBe(false)
  expect(leer?.eigenerText).toBe('')
  expect(leer?.rumpfAnzeige).toBe('grid')
}, 60_000)
