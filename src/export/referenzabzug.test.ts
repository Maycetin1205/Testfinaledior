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
// unter den ersten Typ, der ihn aufnimmt (Kanban-Spalte, ...).
function alleBausteineBaum(marker: (type: string) => Record<string, unknown>): Maskenbaum {
  const defs = [...alleBausteinArten()].sort((a, b) => a.typ.localeCompare(b.typ))
  const tree: Maskenbaum = {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: [] },
  }
  const instanz = new Map<string, string>()

  const platziere = (type: string): string => {
    const vorhanden = instanz.get(type)
    if (vorhanden !== undefined) return vorhanden
    const id = `g-${type}`
    const node: Baustein = { id, typ: type, werte: marker(type), elternId: WURZEL_ID, kinderIds: [] }
    if (darfEnthalten(WURZEL_TYP, type)) {
      tree[WURZEL_ID].kinderIds.push(id)
    } else {
      const elternDef = defs.find((p) => p.typ !== type && darfEnthalten(p.typ, type))
      if (!elternDef) throw new Error(`Baustein ${type} ist nirgends platzierbar`)
      const elternId = platziere(elternDef.typ)
      node.elternId = elternId
      tree[elternId].kinderIds.push(id)
    }
    tree[id] = node
    instanz.set(type, id)
    return id
  }

  for (const def of defs) platziere(def.typ)
  return tree
}

test('jeder Registry-Baustein exportiert seinen Tag', () => {
  const html = exportMask(alleBausteineBaum(() => ({})), 'Alle', [], []).html
  for (const def of alleBausteinArten()) {
    expect(html, `Baustein ${def.typ} fehlt im Export`).toContain('<' + def.tag)
  }
})

// Round-Trip je Baustein: eine geaenderte Text-Eigenschaft muss als Attribut
// hinausgehen. Sonst fallen z. B. umbenannte Spalten im Export still auf die
// Standardtitel zurueck.
test('eine geänderte Eigenschaft erreicht den Export als Attribut', () => {
  const LAYOUT = new Set(['width', 'height', 'rasterX', 'rasterY', 'rasterW', 'rasterH'])
  const pruefbar = new Map<string, string>()
  for (const def of alleBausteinArten()) {
    const seitenProps = new Set(def.eigenschaften
      .filter((p) => p.art === 'seite')
      .flatMap((p) => [p.schluessel, p.klarnameProp ?? '']))
    const nurEditor = new Set(def.eigenschaften
      .filter((p) => p.nurImEditor === true)
      .map((p) => p.schluessel))
    const key = Object.keys(def.vorgaben).find((k) =>
      typeof def.vorgaben[k] === 'string'
      && !LAYOUT.has(k)
      && k !== 'source'
      && k !== WEITERE_QUELLEN_PROP
      && !k.toLowerCase().endsWith('field')
      && !seitenProps.has(k)
      && !nurEditor.has(k))
    if (key !== undefined) pruefbar.set(def.typ, key)
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
