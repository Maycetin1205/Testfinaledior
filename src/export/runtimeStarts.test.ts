import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser } from 'playwright-core'
import { expect, test } from 'vitest'
import '../blocks/register'
import { exportMask } from './exportMask'
import { referenceTree, REFERENCE_SOURCES, REFERENCE_RELATION } from './reference/referenceMask'

const STORE = path.resolve('node_modules/.tmp/runtime-start')

async function browserStart(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  } catch (error) {
    throw new Error(
      'Kein Browser fuer den Starttest. Einmal ausfuehren: '
      + 'node node_modules/playwright-core/cli.js install chromium-headless-shell',
      { cause: error },
    )
  }
}

test('die exportierte Referenzmaske startet im Browser ohne Fehler', async () => {
  const tree = referenceTree()
  const { html } = exportMask(tree, 'Referenzmaske', REFERENCE_SOURCES, REFERENCE_RELATION)
  mkdirSync(STORE, { recursive: true })
  const file = path.join(STORE, 'reference.start.html')
  writeFileSync(file, html)

  const tags = [...new Set(Object.values(tree).map((b) => b.type))]
    .filter((type) => type !== 'root')
    .map((type) => `ff-${type}`)

  const browser = await browserStart()
  try {
    const page = await browser.newPage()
    const error: string[] = []
    page.on('pageerror', (e) => error.push(e.message))
    page.on('console', (m) => { if (m.type() === 'error') error.push(m.text()) })
    await page.goto('file:///' + file.replace(/\\/g, '/'))
    await page.waitForTimeout(800)

    const withoutBridge = error.filter((f) => !/basis\.html\.interface\.js|Failed to load resource/.test(f))
    expect(withoutBridge, 'Fehler beim Start der Maske').toEqual([])

    const state = await page.evaluate((names: string[]) => names.map((tag) => {
      const present = [...document.querySelectorAll(tag)]
      return {
        tag,
        registered: customElements.get(tag) !== undefined,
        rendered: present.length === 0
          ? null
          : present.some((el) => el.shadowRoot !== null && el.shadowRoot.childElementCount > 0),
      }
    }), tags)
    for (const s of state) {
      expect(s.registered, `${s.tag} ist nicht als Element angemeldet`).toBe(true)
      if (s.rendered !== null) expect(s.rendered, `${s.tag} hat nichts gezeichnet`).toBe(true)
    }
  } finally {
    await browser.close()
  }
}, 60_000)
