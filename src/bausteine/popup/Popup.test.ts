// Der Vertrag des Fensters: sein Name ist der Name der Seite, eine Kette ruft
// es damit auf, und ohne Ruf ist es nicht da.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { seitenDerMaske } from '../../kern/maske/seiten'
import type { Schritt } from '../../kern/daten/aktionen'
import { exportMask } from '../../export/exportMask'
import { Popup } from './Popup'

const KETTE: Schritt[] = [{ id: 's1', art: 'POPUP_OPEN', ergebnisName: '', popupId: 'p1' }]

// Zwei Fenster, damit „genau dieses" etwas heisst: der Knopf ruft nur „Hinweis".
function fensterMaske(): Maskenbaum {
  return {
    [WURZEL_ID]: {
      id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['b1', 'p1', 'p2'],
    },
    b1: {
      id: 'b1',
      typ: 'button',
      werte: { rasterX: 0, rasterY: 0, rasterW: 8, rasterH: 3, beschriftung: 'Zeigen' },
      elternId: WURZEL_ID,
      kinderIds: [],
      ketten: { onClick: KETTE },
    },
    p1: {
      id: 'p1', typ: Popup.typ, werte: { name: 'Hinweis' }, elternId: WURZEL_ID, kinderIds: ['tx1'],
    },
    tx1: {
      id: 'tx1',
      typ: 'text',
      werte: { rasterX: 0, rasterY: 0, rasterW: 10, rasterH: 1, text: 'Steht im Fenster' },
      elternId: 'p1',
      kinderIds: [],
    },
    p2: {
      id: 'p2', typ: Popup.typ, werte: { name: 'Zweites' }, elternId: WURZEL_ID, kinderIds: [],
    },
  } as Maskenbaum
}

test('das Fenster meldet sich als Seite an und meldet keine Faehigkeit', () => {
  const art = bausteinArt(Popup.typ)
  expect(art?.tag).toBe('ff-popup')
  expect(art?.seite).toBe(true)
  expect(art?.inPalette).toBe(false)
  expect(Popup.faehigkeiten).toEqual([])
  expect(art?.faehigkeiten).toEqual([])
  expect(Object.keys(Popup.vorgaben)).toEqual(['name', 'breite', 'hoehe'])
})

test('der Name traegt das Fenster durch Seitenliste, Export und Kette', () => {
  const baum = fensterMaske()
  expect(seitenDerMaske(baum).map((s) => s.name)).toEqual(['Hauptseite', 'Hinweis', 'Zweites'])

  const { html } = exportMask(baum, 'Fenstermaske')
  expect(html).toContain('<ff-popup name="Hinweis">')
  // Die Kette nennt das Fenster beim Namen, nicht bei seiner Kennung: nur der
  // Name steht auch am Element, das die Laufzeit sucht.
  expect(html).toContain('&quot;popup&quot;:&quot;Hinweis&quot;')
  expect(html).not.toContain('&quot;popupId&quot;')

  // Was auf der Vorgabe steht, schreibt der Export nicht mit.
  expect(html).not.toContain(' breite=')
  expect(html).not.toContain(' hoehe=')
})

interface FensterStand {
  offene: string[]
  sichtbare: string[]
  fokus: string
}

// Laeuft IM Browser: nur was dort steht, zaehlt hier.
function fensterStand(): FensterStand {
  const fenster = [...document.querySelectorAll('ff-popup')]
  const name = (el: Element): string => el.getAttribute('name') ?? ''
  const aktiv = document.activeElement
  return {
    offene: fenster.filter((f) => f.hasAttribute('offen')).map(name),
    sichtbare: fenster.filter((f) => getComputedStyle(f).display !== 'none').map(name),
    fokus: aktiv === null || aktiv === document.body ? '' : `${aktiv.tagName} ${name(aktiv)}`.trim(),
  }
}

async function fensterLaufImBrowser(): Promise<FensterStand[]> {
  const { html } = exportMask(fensterMaske(), 'Fenstermaske')
  const ablage = path.resolve('node_modules/.tmp/fenster-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'fenster.html')
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(500)

    const zu = await seite.evaluate(fensterStand)
    await seite.evaluate(() => { document.querySelector<HTMLElement>('ff-button')?.click() })
    await seite.waitForTimeout(300)
    const auf = await seite.evaluate(fensterStand)

    await seite.keyboard.press('Escape')
    await seite.waitForTimeout(300)
    return [zu, auf, await seite.evaluate(fensterStand)]
  } finally {
    await browser.close()
  }
}

// Escape gehoert dem Fenster: SoftEngines SEEvent.js hoert am document mit und
// schloesse sonst die ganze Maske.
test('die Kette macht genau das gerufene Fenster auf, Escape macht es zu', async () => {
  const [zu, auf, nachEscape] = await fensterLaufImBrowser()

  expect(zu.offene).toEqual([])
  expect(zu.sichtbare, 'ein ungerufenes Fenster steht auf der Maske').toEqual([])

  expect(auf.offene).toEqual(['Hinweis'])
  expect(auf.sichtbare).toEqual(['Hinweis'])
  // Ohne den Sprung tippt der Bediener ins Fenster und nichts nimmt es an.
  expect(auf.fokus).toBe('FF-POPUP Hinweis')

  expect(nachEscape.offene).toEqual([])
  expect(nachEscape.sichtbare).toEqual([])
}, 60_000)
