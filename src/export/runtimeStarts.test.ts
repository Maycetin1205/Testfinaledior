import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser } from 'playwright-core'
import { afterAll, beforeAll, expect, test } from 'vitest'
import '../blocks/register'
import { allBlockTypes, mayContain } from '../core/block/registry'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../core/block/tree'
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

let browser: Browser
beforeAll(async () => {
  mkdirSync(STORE, { recursive: true })
  browser = await browserStart()
}, 60_000)
afterAll(async () => { await browser?.close() })

// Opens the exported mask and checks: no error, every block of the tree
// registered, and each one present has drawn something.
async function expectStarts(name: string, tree: MaskTree, html: string): Promise<void> {
  const file = path.join(STORE, `${name}.start.html`)
  writeFileSync(file, html)

  const tags = [...new Set(Object.values(tree).map((b) => b.type))]
    .filter((type) => type !== ROOT_TYPE)
    .map((type) => `ff-${type}`)

  const page = await browser.newPage()
  try {
    const error: string[] = []
    page.on('pageerror', (e) => error.push(e.message))
    page.on('console', (m) => { if (m.type() === 'error') error.push(m.text()) })
    await page.goto('file:///' + file.replace(/\\/g, '/'))
    await page.waitForTimeout(800)

    const withoutBridge = error.filter((f) => !/basis\.html\.interface\.js|Failed to load resource/.test(f))
    expect(withoutBridge, `${name}: Fehler beim Start der Maske`).toEqual([])

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
      expect(s.registered, `${name}: ${s.tag} ist nicht als Element angemeldet`).toBe(true)
      if (s.rendered !== null) expect(s.rendered, `${name}: ${s.tag} hat nichts gezeichnet`).toBe(true)
    }
  } finally {
    await page.close()
  }
}

// One block of the type, under the root or under the first block that takes it.
function aloneTree(type: string): MaskTree {
  const tree: MaskTree = {
    [ROOT_ID]: { id: ROOT_ID, type: ROOT_TYPE, values: {}, parentId: null, childIds: [] },
  }
  let parentId = ROOT_ID
  if (!mayContain(ROOT_TYPE, type)) {
    const parent = allBlockTypes().find((p) => p.type !== type && mayContain(ROOT_TYPE, p.type) && mayContain(p.type, type))
    if (!parent) throw new Error(`Baustein ${type} ist nirgends platzierbar`)
    tree.p = { id: 'p', type: parent.type, values: {}, parentId: ROOT_ID, childIds: [] }
    tree[ROOT_ID].childIds.push('p')
    parentId = 'p'
  }
  tree.b = { id: 'b', type, values: {}, parentId, childIds: [] }
  tree[parentId].childIds.push('b')
  return tree
}

test('die exportierte Referenzmaske startet im Browser ohne Fehler', async () => {
  const tree = referenceTree()
  const { html } = exportMask(tree, 'Referenzmaske', REFERENCE_SOURCES, REFERENCE_RELATION)
  await expectStarts('reference', tree, html)
}, 60_000)

// The export carries only the runtime parts of the blocks in the mask: each
// block starts with its own, without the code of the others.
test('jeder Baustein startet allein mit seinem Teil der Laufzeit', async () => {
  for (const def of allBlockTypes()) {
    const tree = aloneTree(def.type)
    await expectStarts(def.type, tree, exportMask(tree, def.type, [], []).html)
  }
}, 120_000)
