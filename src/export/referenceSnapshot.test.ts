import type { PropertyValue } from '../core/block/property'
import { SOURCE_PROP } from '../core/block/sourceProperty'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import '../blocks/register'
import { ROOT_ID, ROOT_TYPE, type BlockNode, type MaskTree } from '../core/block/tree'
import { mayContain, allBlockTypes } from '../core/block/registry'
import { EXTRA_SOURCES_PROP } from '../core/data/extraSources'
import { exportMask } from './exportMask'
import { referenceTree, REFERENCE_SOURCES, REFERENCE_RELATION } from './reference/referenceMask'

const HTML_PATH = fileURLToPath(new URL('./reference/reference.html', import.meta.url))
const SV_PATH = fileURLToPath(new URL('./reference/reference.sevariablen.json', import.meta.url))

function withoutRuntime(html: string): string {
  const start = html.lastIndexOf('<script>')
  const end = html.indexOf('</script>', start)
  if (start < 0 || end < 0) throw new Error('Der Export enthaelt keine Laufzeit')
  return html.slice(0, start) + '<!-- Laufzeit separat geprüft -->' + html.slice(end + '</script>'.length)
}

const refresh = process.env.REFERENCE_REFRESH === '1'

test('Struktur und ERP-Konfiguration entsprechen der Referenz', () => {
  const { html, sevariablen } = exportMask(
    referenceTree(), 'Referenzmaske', REFERENCE_SOURCES, REFERENCE_RELATION,
  )
  if (refresh) {
    writeFileSync(HTML_PATH, withoutRuntime(html))
    writeFileSync(SV_PATH, sevariablen)
  }
  expect(withoutRuntime(html)).toBe(readFileSync(HTML_PATH, 'utf8'))
  expect(sevariablen).toBe(readFileSync(SV_PATH, 'utf8'))
})

function allBlocksTree(marker: (type: string) => Record<string, PropertyValue>): MaskTree {
  const defs = [...allBlockTypes()].sort((a, b) => a.type.localeCompare(b.type))
  const tree: MaskTree = {
    [ROOT_ID]: { id: ROOT_ID, type: ROOT_TYPE, values: {}, parentId: null, childIds: [] },
  }
  const instance = new Map<string, string>()

  const place = (type: string): string => {
    const present = instance.get(type)
    if (present !== undefined) return present
    const id = `g-${type}`
    const node: BlockNode = { id, type: type, values: marker(type), parentId: ROOT_ID, childIds: [] }
    if (mayContain(ROOT_TYPE, type)) {
      tree[ROOT_ID].childIds.push(id)
    } else {
      const parentDef = defs.find((p) => p.type !== type && mayContain(p.type, type))
      if (!parentDef) throw new Error(`Baustein ${type} ist nirgends platzierbar`)
      const parentId = place(parentDef.type)
      node.parentId = parentId
      tree[parentId].childIds.push(id)
    }
    tree[id] = node
    instance.set(type, id)
    return id
  }

  for (const def of defs) place(def.type)
  return tree
}

test('jeder Registry-Baustein exportiert seinen Tag', () => {
  const html = exportMask(allBlocksTree(() => ({})), 'Alle', [], []).html
  for (const def of allBlockTypes()) {
    expect(html, `Baustein ${def.type} fehlt im Export`).toContain('<' + def.tag)
  }
})

test('eine geänderte Eigenschaft erreicht den Export als Attribut', () => {
  const checkable = new Map<string, string>()
  for (const def of allBlockTypes()) {
    const key = Object.entries(def.properties).find(([k, p]) =>
      typeof p.default === 'string'
      && p.attribute !== ''
      && k !== SOURCE_PROP
      && k !== EXTRA_SOURCES_PROP
      && !k.toLowerCase().endsWith('field'))?.[0]
    if (key !== undefined) checkable.set(def.type, key)
  }
  expect(checkable.size, 'kaum ein Baustein hat eine pruefbare Text-Eigenschaft').toBeGreaterThan(6)

  const html = exportMask(
    allBlocksTree((type) => {
      const attr = checkable.get(type)
      return attr === undefined ? {} : { [attr]: `pruefwert-${type}` }
    }),
    'Alle', [], [],
  ).html
  for (const [type, attr] of checkable) {
    expect(html, `${type}: ${attr} kam nicht im Export an`)
      .toContain(`${attr.toLowerCase()}="pruefwert-${type}"`)
  }
})
