// Beweist, dass die exportierte Maske im Browser startet: kein Fehler beim
// Laden, jeder Baustein der Maske ist als Element angemeldet und gezeichnet.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser } from 'playwright-core'
import { expect, test } from 'vitest'
import '../bausteine/anmeldung'
import { exportMask } from './exportMask'
import { referenzBaum, REFERENZ_QUELLEN, REFERENZ_RELATIONEN } from './referenz/referenzMaske'

const ABLAGE = path.resolve('node_modules/.tmp/laufzeit-start')

// Ohne Browser gibt es keinen Beweis, also keinen leisen Sprung: derselbe
// Weg wie tools/sichtprobe.cjs, mit demselben Hinweis zur Installation.
async function browserStarten(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  } catch (fehler) {
    throw new Error(
      'Kein Browser fuer den Starttest. Einmal ausfuehren: '
      + 'node node_modules/playwright-core/cli.js install chromium-headless-shell',
      { cause: fehler },
    )
  }
}

test('die exportierte Referenzmaske startet im Browser ohne Fehler', async () => {
  const baum = referenzBaum()
  const { html } = exportMask(baum, 'Referenzmaske', REFERENZ_QUELLEN, REFERENZ_RELATIONEN)
  mkdirSync(ABLAGE, { recursive: true })
  const datei = path.join(ABLAGE, 'referenz.start.html')
  writeFileSync(datei, html)

  const tags = [...new Set(Object.values(baum).map((b) => b.typ))]
    .filter((typ) => typ !== 'root')
    .map((typ) => `ff-${typ}`)

  const browser = await browserStarten()
  try {
    const seite = await browser.newPage()
    const fehler: string[] = []
    seite.on('pageerror', (e) => fehler.push(e.message))
    seite.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()) })
    await seite.goto('file:///' + datei.replace(/\\/g, '/'))
    await seite.waitForTimeout(800)

    // Die Bruecke zu SoftEngine fehlt hier absichtlich (404 auf EditorPfad);
    // die Maske muss trotzdem zeichnen, nur ohne Daten.
    const ohneBruecke = fehler.filter((f) => !/basis\.html\.interface\.js|Failed to load resource/.test(f))
    expect(ohneBruecke, 'Fehler beim Start der Maske').toEqual([])

    // Ein Baustein, der nur in einer Vorlage steht (Kartenmuster im Kanban),
    // wird erst mit Daten gezeichnet; von ihm zaehlt nur die Anmeldung.
    const stand = await seite.evaluate((namen: string[]) => namen.map((tag) => {
      const vorhanden = [...document.querySelectorAll(tag)]
      return {
        tag,
        angemeldet: customElements.get(tag) !== undefined,
        gezeichnet: vorhanden.length === 0
          ? null
          : vorhanden.some((el) => el.shadowRoot !== null && el.shadowRoot.childElementCount > 0),
      }
    }), tags)
    for (const s of stand) {
      expect(s.angemeldet, `${s.tag} ist nicht als Element angemeldet`).toBe(true)
      if (s.gezeichnet !== null) expect(s.gezeichnet, `${s.tag} hat nichts gezeichnet`).toBe(true)
    }
  } finally {
    await browser.close()
  }
}, 60_000)
