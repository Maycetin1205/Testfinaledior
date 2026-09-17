// Beweist, dass eine Maske nur die Laufzeitteile traegt, die ihre Bausteine
// einstecken, und zeigt je Teil die Groesse. Zielort: src/export/.
import { expect, test } from 'vitest'
import '../bausteine/anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Baustein, type Maskenbaum } from '../kern/maske/baum'
import { exportMask } from './exportMask'
import laufzeitRoh from './generated/laufzeit.json?raw'
import { referenzBaum, REFERENZ_QUELLEN, REFERENZ_RELATIONEN } from './referenz/referenzMaske'

interface Teil { name: string; datei: string; bausteine: string[]; braucht: string[] }
interface Verzeichnis { basisDatei: string; teile: Teil[]; inhalte: Record<string, string> }

const verzeichnis = JSON.parse(laufzeitRoh) as Verzeichnis

// Obergrenzen in Byte, Stand 16.09.2026. Wer sie hochsetzt, sagt im Commit,
// welcher Teil warum dazukam.
const GRENZE_KLEIN = 40_000
const GRENZE_MITTEL = 135_000

// Der Export maskiert Nicht-ASCII und `</script`; darum erkennt der Test einen
// Teil an seinem laengsten reinen ASCII-Stueck ohne `<`, nicht am ganzen Text.
function kennzeichen(teil: Teil): string {
  let bestes = ''
  for (const stueck of verzeichnis.inhalte[teil.datei].split(/[^\x20-\x3b\x3d-\x7e]+/)) {
    if (stueck.length > bestes.length) bestes = stueck
  }
  if (bestes.length < 80) throw new Error(`Laufzeitteil ${teil.name} (${teil.datei}) ist leer oder ohne Kennzeichen gebaut`)
  return bestes
}

// Leere Teile meldet der eigene Test unten; hier stoeren sie die Zaehlung nicht.
function teileImExport(html: string): Map<string, number> {
  const gefunden = new Map<string, number>()
  for (const teil of verzeichnis.teile) {
    const inhalt = verzeichnis.inhalte[teil.datei]
    if (inhalt.length === 0) continue
    if (html.includes(kennzeichen(teil))) gefunden.set(teil.name, inhalt.length)
  }
  return gefunden
}

test('jeder Laufzeitteil ist gebaut und erkennbar', () => {
  for (const teil of verzeichnis.teile) expect(() => kennzeichen(teil)).not.toThrow()
})

function bericht(titel: string, teile: Map<string, number>): number {
  const basis = verzeichnis.inhalte[verzeichnis.basisDatei].length
  const zeilen = [`${titel}`, `  ${String(basis).padStart(7)}  basis`]
  let summe = basis
  for (const [name, groesse] of [...teile].sort((a, b) => b[1] - a[1])) {
    zeilen.push(`  ${String(groesse).padStart(7)}  ${name}`)
    summe += groesse
  }
  zeilen.push(`  ${String(summe).padStart(7)}  Summe`)
  console.log(zeilen.join('\n'))
  return summe
}

function knoten(id: string, typ: string, eltern: string | null, werte: Record<string, unknown>, kinder: string[] = []): Baustein {
  return { id, typ, werte, elternId: eltern, kinderIds: kinder }
}

function textMaske(): Maskenbaum {
  return {
    [WURZEL_ID]: knoten(WURZEL_ID, WURZEL_TYP, null, {}, ['tx1']),
    tx1: knoten('tx1', 'text', WURZEL_ID, { rasterX: 0, rasterY: 0, rasterW: 14, rasterH: 3 }),
  }
}

function trennerMaske(): Maskenbaum {
  return {
    [WURZEL_ID]: knoten(WURZEL_ID, WURZEL_TYP, null, {}, ['tr1']),
    tr1: knoten('tr1', 'trenner', WURZEL_ID, { rasterX: 0, rasterY: 0, rasterW: 14, rasterH: 1 }),
  }
}

function textUndTabelleMaske(): Maskenbaum {
  return {
    ...textMaske(),
    [WURZEL_ID]: knoten(WURZEL_ID, WURZEL_TYP, null, {}, ['tx1', 't2']),
    t2: knoten('t2', 'tabelle', WURZEL_ID, {
      rasterX: 0, rasterY: 3, rasterW: 28, rasterH: 12,
      quelle: 'q-pos',
      spalten: [
        { kennung: 'sp-art', titel: 'ArtNr', feld: '18_25' },
        { kennung: 'sp-bez', titel: 'Bezeichnung', feld: '45_60' },
      ],
    }),
  }
}

const VERBOTEN_KLEIN = ['tabelle', 'erfassung', 'kanban', 'formfeld', 'karte', 'popup', 'datum', 'button']
const VERBOTEN_MITTEL = ['erfassung', 'kanban', 'formfeld', 'nachschlagen', 'DialogRahmen', 'vorschlag', 'kartenTafel']

// Kern und Bruecke reisen wie eine Faehigkeit: nur mit dem Baustein, der sie
// importiert. Ein Trenner holt keine Daten, also faehrt keine SoftEngine mit.
test('eine Maske ohne Daten traegt weder Kern- noch Brueckenteil', () => {
  const { html } = exportMask(trennerMaske(), 'Trennermaske')
  const teile = teileImExport(html)
  const summe = bericht('Maske ohne Daten: ein Trenner', teile)
  expect([...teile.keys()], 'Gepaeck, das ein Trenner nicht braucht').toEqual(['trenner'])
  expect(summe, 'die Maske ohne Daten ist schwerer als erlaubt').toBeLessThanOrEqual(GRENZE_KLEIN)
})

test('ein Textfeld traegt keinen anderen Baustein', () => {
  const { html } = exportMask(textMaske(), 'Textmaske')
  const teile = teileImExport(html)
  bericht('Kleine Maske: ein Textfeld', teile)
  expect(teile.has('text')).toBe(true)
  for (const name of VERBOTEN_KLEIN) expect(teile.has(name), `${name} reist mit`).toBe(false)
})

// Rot mit Ansage, und der Umbau des Textfelds hat daran nichts geaendert: ein
// Text kann an ein Feld gebunden werden, und leseGebundeneStelle
// (bausteine/faehigkeiten/gebundeneStelle.ts) holt die Zeile ueber die
// Eigenschaft `quelle`; macheDatenAnschluss verdrahtet dazu die holenden
// Quellen der ganzen Maske. Gruen wird das erst, wenn ein Text keine Bindung
// mehr traegt — das entscheidet der Nutzer, nicht ein Umbau.
test.fails('ein Textfeld traegt nur den Teil Text', () => {
  const { html } = exportMask(textMaske(), 'Textmaske')
  const teile = teileImExport(html)
  const summe = bericht('Kleine Maske: ein Textfeld, Ziel', teile)
  expect([...teile.keys()], 'Gepaeck, das kein Baustein der Maske braucht').toEqual(['text'])
  expect(summe, 'die kleine Maske ist schwerer als erlaubt').toBeLessThanOrEqual(GRENZE_KLEIN)
})

test('Text und Tabelle ohne Nachschlagen tragen kein Nachschlagen, Erfassen oder Kanban', () => {
  const { html } = exportMask(textUndTabelleMaske(), 'Tabellenmaske', REFERENZ_QUELLEN)
  const teile = teileImExport(html)
  const summe = bericht('Mittlere Maske: Textfeld und Tabelle', teile)
  expect(teile.has('text')).toBe(true)
  expect(teile.has('tabelle')).toBe(true)
  const eindringlinge = [...teile.keys()].filter((name) => VERBOTEN_MITTEL.some((v) => name.includes(v)))
  expect(eindringlinge, 'Teile, die eine Tabelle ohne Nachschlagen nicht braucht').toEqual([])
  expect(summe, 'die mittlere Maske ist schwerer als erlaubt').toBeLessThanOrEqual(GRENZE_MITTEL)
})

test('die Referenzmaske traegt jeden Bausteinteil genau einmal', () => {
  const baum = referenzBaum()
  const { html } = exportMask(baum, 'Referenzmaske', REFERENZ_QUELLEN, REFERENZ_RELATIONEN)
  const teile = teileImExport(html)
  bericht('Volle Palette: Referenzmaske', teile)
  const aufDerMaske = new Set(Object.values(baum).map((b) => b.typ))
  for (const teil of verzeichnis.teile) {
    if (!teil.bausteine.some((typ) => aufDerMaske.has(typ))) continue
    expect(teile.has(teil.name), `Baustein ${teil.name} steht auf der Maske, sein Teil fehlt`).toBe(true)
    const marke = kennzeichen(teil)
    expect(html.split(marke).length - 1, `Teil ${teil.name} ist mehrfach im Skript`).toBe(1)
  }
})
