// Der Vertrag der Erfassung mit Export und Maske: was der Editor einstellt, steht
// als Attribut im Export, und die Maske liest genau diese Namen.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { bausteinArt } from '../../kern/maske/registry'
import { exportMask } from '../../export/exportMask'
import { Erfassung } from './Erfassung'

const QUELLE = {
  id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [{ code: '18_25', name: 'ArtNr' }, { code: '164_8', name: 'Menge' }],
} as const

// Eine Berechnung, wie sie eine gespeicherte Maske traegt.
const DOPPELT = {
  kennung: 'b1',
  name: 'Doppelt',
  leit: { art: 'spalte', kennung: 'f0', spalte: 'sp-doppelt', einheit: 'anzahl', ergebnis: true, runden: { stellen: 2, richtung: 'kfm' } },
  zaehler: [
    { art: 'spalte', kennung: 'f1', spalte: 'sp-menge', einheit: 'anzahl', ergebnis: false, runden: { stellen: 3, richtung: 'kfm' } },
    { art: 'zahl', kennung: 'f2', name: '2', zahl: 2, einheit: 'anzahl' },
  ],
  nenner: [],
}

// Frisch angelegt und noch nicht ausgefuellt: keine Groesse traegt eine Spalte.
const OHNE_SPALTEN = {
  kennung: 'b2',
  name: 'Berechnung 2',
  leit: { art: 'spalte', kennung: 'f0', spalte: '', einheit: 'anzahl', ergebnis: true, runden: { stellen: 3, richtung: 'kfm' } },
  zaehler: [{ art: 'spalte', kennung: 'f100', spalte: '', einheit: 'anzahl', ergebnis: true, runden: { stellen: 3, richtung: 'kfm' } }],
  nenner: [],
}

const SPALTEN = [
  { kennung: 'sp-art', titel: 'ArtNr', feld: '18_25' },
  { kennung: 'sp-menge', titel: 'Menge', feld: '164_8', aenderbar: false, fuellFeld: 'q-art::menge', fensterBreite: 600 },
  { kennung: 'sp-doppelt', titel: 'Doppelt', feld: '' },
]

function maskeMitErfassung(werte: Record<string, unknown>): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['e1'] },
    e1: {
      id: 'e1',
      typ: Erfassung.typ,
      werte: { rasterX: 0, rasterY: 0, rasterW: 24, rasterH: 12, ...werte },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

function erfassungsTag(werte: Record<string, unknown>): string {
  const { html } = exportMask(maskeMitErfassung(werte), 'Test', [QUELLE], [])
  return /<ff-erfassung[^>]*>/.exec(html)?.[0] ?? ''
}

test('die Erfassung meldet sich mit deutschen Eigenschaften und ihren Faehigkeiten an', () => {
  const art = bausteinArt(Erfassung.typ)
  expect(art?.tag).toBe('ff-erfassung')
  expect(Object.keys(Erfassung.vorgaben)).toEqual([
    'quelle', 'spalten', 'suche', 'blaettern', 'kopfzeile', 'spaltenwahl', 'tagFeld',
    'leerText', 'loeschbar', 'berechnungen',
  ])
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual([
    'quelle', 'satzwahl', 'auswahlFolgen', 'liste', 'ereignisse',
    'erfassen', 'aendern', 'loeschen', 'haeltGesendete', 'rechnen', 'suchfenster',
  ])
  const bindung = faehigkeit(art, 'liste')?.bindung
  expect((bindung?.eintragsSchalter ?? []).map((s) => s.schluessel))
    .toEqual(['summe', 'aenderbar', 'versteckt'])
  expect((bindung?.eintragsFeldWahl ?? []).map((w) => w.schluessel)).toEqual(['fuellFeld'])
})

// Nichts an der Erfassung heisst mehr anders als vorher; eine gespeicherte Maske
// gibt genau ihre Schluessel wieder ab.
test('Quelle, Spalten, Loeschkreuz und Berechnung erreichen den Export unter ihren Namen', () => {
  const tag = erfassungsTag({
    quelle: 'q1', spalten: SPALTEN, loeschbar: 'ja', suche: 'nein', berechnungen: [DOPPELT],
  })
  expect(tag).toContain(' quelle="q1"')
  expect(tag).toContain(' loeschbar="ja"')
  expect(tag).toContain(' suche="nein"')
  expect(tag).toContain('&quot;feld&quot;:&quot;18_25&quot;')
  expect(tag).toContain('&quot;fuellFeld&quot;:&quot;q-art::menge&quot;')
  expect(tag).toContain('&quot;aenderbar&quot;:false')
  expect(tag).toContain('&quot;fensterBreite&quot;:600')
  expect(tag).toContain(' berechnungen="')
  expect(tag).toContain('&quot;spalte&quot;:&quot;sp-doppelt&quot;')
  expect(tag).not.toContain('source=')
  expect(tag).not.toContain(' width=')
})

// Sie rechnet an keiner Zeile etwas; in der Maske haette sie nur Gewicht und
// meldete bei jedem Tastendruck, dass ihr eine Spalte fehlt.
test('eine Berechnung ohne gewaehlte Spalten reist nicht in die Maske', () => {
  expect(erfassungsTag({ quelle: 'q1', spalten: SPALTEN, berechnungen: [OHNE_SPALTEN] }))
    .not.toContain('berechnungen=')

  const beide = erfassungsTag({ quelle: 'q1', spalten: SPALTEN, berechnungen: [DOPPELT, OHNE_SPALTEN] })
  expect(beide).toContain('&quot;kennung&quot;:&quot;b1&quot;')
  expect(beide).not.toContain('&quot;kennung&quot;:&quot;b2&quot;')
})

async function erfassungsZeileIm(werte: Record<string, unknown>): Promise<{
  kopf: string[]
  platzhalter: string[]
}> {
  const { html } = exportMask(maskeMitErfassung(werte), 'Erfassungsmaske', [QUELLE], [])
  const ablage = path.resolve('node_modules/.tmp/erfassung-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, `${String(werte.kopfzeile)}.html`)
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    await seite.goto('file:///' + datei.replace(/\\/g, '/'))
    await seite.waitForTimeout(500)
    return await seite.evaluate(() => {
      const wurzel = document.querySelector('ff-erfassung')?.shadowRoot
      return {
        kopf: [...(wurzel?.querySelectorAll('.kopf .kopf-text') ?? [])]
          .map((k) => k.textContent?.trim() ?? ''),
        platzhalter: [...(wurzel?.querySelectorAll('.zeile.erfassung input') ?? [])]
          .map((i) => i.getAttribute('placeholder') ?? ''),
      }
    })
  } finally {
    await browser.close()
  }
}

// Der Titel gehoert an EINEN Ort. Mit Kopfzeile steht er oben, die Zelle bleibt
// leer; ohne sie ist die Zelle der einzige Platz dafuer.
test('der Spaltentitel steht mit Kopfzeile nicht noch einmal in der Erfassungszeile', async () => {
  const mitKopf = await erfassungsZeileIm({ quelle: 'q1', spalten: SPALTEN, kopfzeile: 'ja' })
  expect(mitKopf.kopf).toEqual(['ArtNr', 'Menge', 'Doppelt'])
  expect(mitKopf.platzhalter).toEqual(['', '', ''])

  const ohneKopf = await erfassungsZeileIm({ quelle: 'q1', spalten: SPALTEN, kopfzeile: 'nein' })
  expect(ohneKopf.kopf).toEqual([])
  expect(ohneKopf.platzhalter).toEqual(['ArtNr', 'Menge', 'Doppelt'])
}, 60_000)
