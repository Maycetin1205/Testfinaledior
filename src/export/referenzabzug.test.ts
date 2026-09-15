import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import '../bausteine/anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Baustein, type Maskenbaum } from '../kern/maske/baum'
import { darfEnthalten, alleBausteinArten } from '../kern/maske/registry'
import { WEITERE_QUELLEN_PROP } from '../kern/daten/weitereQuellen'
import { exportMask } from './exportMask'
import { referenzBaum, REFERENZ_QUELLEN, REFERENZ_RELATIONEN } from './referenz/referenzMaske'

const HTML_PFAD = fileURLToPath(new URL('./referenz/referenz.html', import.meta.url))
const SV_PFAD = fileURLToPath(new URL('./referenz/referenz.sevariablen.json', import.meta.url))

// Die Strukturreferenz enthaelt keine kompilierte Laufzeit. Deren reproduzierbarer
// Bau wird separat in runtimeBuendel.test.ts geprueft.
function ohneLaufzeit(html: string): string {
  const start = html.lastIndexOf('<script>')
  const ende = html.indexOf('</script>', start)
  if (start < 0 || ende < 0) throw new Error('Der Export enthaelt keine Laufzeit')
  return html.slice(0, start) + '<!-- Laufzeit separat geprüft -->' + html.slice(ende + '</script>'.length)
}

const erneuern = process.env.REFERENZ_ERNEUERN === '1'

test('Struktur und ERP-Konfiguration entsprechen der Referenz', () => {
  const { html, sevariablen } = exportMask(
    referenzBaum(), 'Referenzmaske', REFERENZ_QUELLEN, REFERENZ_RELATIONEN,
  )
  if (erneuern) {
    writeFileSync(HTML_PFAD, ohneLaufzeit(html))
    writeFileSync(SV_PFAD, sevariablen)
  }
  expect(ohneLaufzeit(html)).toBe(readFileSync(HTML_PFAD, 'utf8'))
  expect(sevariablen).toBe(readFileSync(SV_PFAD, 'utf8'))
})

// Jeder Baustein einmal in einen Baum: an die Wurzel, wenn erlaubt, sonst
// unter den ersten Typ, der ihn aufnimmt (Kanban-Spalte, Navi-Eintrag, ...).
function alleBausteineBaum(marker: (type: string) => Record<string, unknown>): Maskenbaum {
  const defs = [...alleBausteinArten()].sort((a, b) => a.type.localeCompare(b.type))
  const tree: Maskenbaum = {
    [WURZEL_ID]: { id: WURZEL_ID, type: WURZEL_TYP, props: {}, parentId: null, childIds: [] },
  }
  const instanz = new Map<string, string>()

  const platziere = (type: string): string => {
    const vorhanden = instanz.get(type)
    if (vorhanden !== undefined) return vorhanden
    const id = `g-${type}`
    const node: Baustein = { id, type, props: marker(type), parentId: WURZEL_ID, childIds: [] }
    if (darfEnthalten(WURZEL_TYP, type)) {
      tree[WURZEL_ID].childIds.push(id)
    } else {
      const elternDef = defs.find((p) => p.type !== type && darfEnthalten(p.type, type))
      if (!elternDef) throw new Error(`Baustein ${type} ist nirgends platzierbar`)
      const elternId = platziere(elternDef.type)
      node.parentId = elternId
      tree[elternId].childIds.push(id)
    }
    tree[id] = node
    instanz.set(type, id)
    return id
  }

  for (const def of defs) platziere(def.type)
  return tree
}

test('jeder Registry-Baustein exportiert seinen Tag', () => {
  const html = exportMask(alleBausteineBaum(() => ({})), 'Alle', [], []).html
  for (const def of alleBausteinArten()) {
    expect(html, `Baustein ${def.type} fehlt im Export`).toContain('<' + def.tagName)
  }
})

// Round-Trip je Baustein: eine geaenderte Text-Eigenschaft muss als Attribut
// hinausgehen. Sonst fallen z. B. umbenannte Spalten im Export still auf die
// Standardtitel zurueck.
test('eine geänderte Eigenschaft erreicht den Export als Attribut', () => {
  const LAYOUT = new Set(['width', 'height', 'rasterX', 'rasterY', 'rasterW', 'rasterH'])
  const pruefbar = new Map<string, string>()
  for (const def of alleBausteinArten()) {
    const seitenProps = new Set(def.customProperties
      .filter((p) => p.kind === 'seite')
      .flatMap((p) => [p.attributeName, p.klarnameProp ?? '']))
    const nurEditor = new Set(def.customProperties
      .filter((p) => p.nurImEditor === true)
      .map((p) => p.attributeName))
    const key = Object.keys(def.defaultProps).find((k) =>
      typeof def.defaultProps[k] === 'string'
      && !LAYOUT.has(k)
      && k !== 'source'
      && k !== WEITERE_QUELLEN_PROP
      && !k.toLowerCase().endsWith('field')
      && !seitenProps.has(k)
      && !nurEditor.has(k))
    if (key !== undefined) pruefbar.set(def.type, key)
  }
  expect(pruefbar.size, 'kaum ein Baustein hat eine pruefbare Text-Eigenschaft').toBeGreaterThan(7)

  const html = exportMask(
    alleBausteineBaum((type) => {
      const attr = pruefbar.get(type)
      return attr === undefined ? {} : { [attr]: `pruefwert-${type}` }
    }),
    'Alle', [], [],
  ).html
  for (const [type, attr] of pruefbar) {
    expect(html, `${type}: ${attr} kam nicht im Export an`)
      .toContain(`${attr.toLowerCase()}="pruefwert-${type}"`)
  }
})
