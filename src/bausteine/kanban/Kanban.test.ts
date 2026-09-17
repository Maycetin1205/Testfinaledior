// Der Vertrag der Tafel: deutsche Attribute im Export, und in der Maske landet
// jede Zeile in der Spalte und der Unterteilung, die ihre Felder nennen.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { exportMask } from '../../export/exportMask'
import { Kanban } from './Kanban'

const QUELLE = {
  id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [
    { code: '18_25', name: 'Status' },
    { code: '30_10', name: 'Mitarbeiter' },
    { code: '45_60', name: 'Bezeichnung' },
  ],
} as const

// Drei Spalten: eine fuer A, eine fuer B mit zwei Unterteilungen, eine als
// Auffang. Dazu die eine Karte, die als Vorlage der Tafel haengt.
function tafelMaske(): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['k1'] },
    k1: {
      id: 'k1',
      typ: Kanban.typ,
      werte: { rasterX: 0, rasterY: 0, rasterW: 40, rasterH: 16, quelle: 'q1', spaltenFeld: '18_25' },
      elternId: WURZEL_ID,
      kinderIds: ['c1', 's1', 's2', 's3'],
    },
    c1: {
      id: 'c1',
      typ: 'karte',
      werte: { titel: 'Karte', titelField: '45_60' },
      elternId: 'k1',
      kinderIds: [],
    },
    s1: { id: 's1', typ: 'kanban-spalte', werte: { titel: 'Offen', wert: 'A' }, elternId: 'k1', kinderIds: [] },
    s2: {
      id: 's2',
      typ: 'kanban-spalte',
      werte: { titel: 'In Arbeit', wert: 'B', unterteilungsFeld: '30_10' },
      elternId: 'k1',
      kinderIds: ['z1', 'z2'],
    },
    z1: { id: 'z1', typ: 'kanban-zimmer', werte: { titel: 'Meier', wert: 'Z1' }, elternId: 's2', kinderIds: [] },
    z2: { id: 'z2', typ: 'kanban-zimmer', werte: { titel: 'Schulz', wert: 'Z2' }, elternId: 's2', kinderIds: [] },
    s3: {
      id: 's3',
      typ: 'kanban-spalte',
      werte: { titel: 'Rest', auffang: 'ja' },
      elternId: 'k1',
      kinderIds: [],
    },
  } as Maskenbaum
}

const ZEILEN = [
  { '645_10': '1', '18_25': 'A', '30_10': '', '45_60': 'Erste' },
  { '645_10': '2', '18_25': 'B', '30_10': 'Z2', '45_60': 'Zweite' },
  { '645_10': '3', '18_25': 'X', '30_10': '', '45_60': 'Dritte' },
]

test('die Tafel meldet ihre Faehigkeiten, ihre Vorlage und ihre erlaubten Kinder', () => {
  const art = bausteinArt(Kanban.typ)
  expect(art?.tag).toBe('ff-kanban')
  expect(Object.keys(Kanban.vorgaben)).toEqual(['quelle', 'spaltenFeld', 'tagFeld', 'leerText'])
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual(['quelle', 'satzwahl', 'ereignisse'])
  expect(faehigkeit(art, 'ereignisse')?.liste.map((e) => e.schluessel))
    .toEqual(['onCardClick', 'onCardDrop'])
  // Die Vorlage haengt an der Tafel, nicht in einem eigenen Musterbaustein.
  expect(art?.musterKind).toEqual({ typ: 'karte', name: 'Kartenmuster', richtung: 'column' })
  expect(art?.erlaubteKinder).toEqual(['karte', 'kanban-spalte'])
  expect(art?.kindKnopf).toEqual({ name: 'Spalte', kindTyp: 'kanban-spalte' })
})

test('Spalten und Unterteilungen erreichen den Export unter deutschen Namen', () => {
  const { html } = exportMask(tafelMaske(), 'Tafelmaske', [QUELLE], [])

  expect(/<ff-kanban[ >]/.exec(html)).not.toBeNull()
  const tafel = /<ff-kanban [^>]*>/.exec(html)?.[0] ?? ''
  expect(tafel).toContain(' quelle="q1"')
  expect(tafel).toContain(' spaltenfeld="18_25"')

  expect(html).toContain('<ff-kanban-spalte titel="Offen" wert="A"')
  expect(html).toContain(' unterteilungsfeld="30_10"')
  expect(html).toContain('<ff-kanban-zimmer titel="Schulz" wert="Z2"')
  expect(html).toContain(' auffang="ja"')

  // Die englischen Namen von frueher stehen nirgends mehr, und der Musterkasten
  // ist kein Baustein mehr.
  expect(html).not.toContain('statusfield=')
  expect(html).not.toContain('zimmerfield=')
  expect(html).not.toContain('heading=')
  expect(html).not.toContain('variant=')
  expect(html).not.toContain('ff-kanban-muster')
})

interface SpaltenStand {
  titel: string
  anzahl: string
  eigene: string[]
  zimmer: { titel: string; karten: string[] }[]
}

// Laeuft IM Browser: nur was dort steht, zaehlt hier.
function tafelStand(): SpaltenStand[] {
  const titelVon = (karte: Element): string =>
    karte.shadowRoot?.querySelector('.name')?.textContent?.trim() ?? ''
  const kartenIn = (el: Element): string[] =>
    [...el.children].filter((k) => k.tagName.toLowerCase() === 'ff-karte').map(titelVon)

  return [...document.querySelectorAll('ff-kanban-spalte')].map((spalte) => ({
    titel: spalte.getAttribute('titel') ?? '',
    anzahl: spalte.shadowRoot?.querySelector('.anzahl')?.textContent?.trim() ?? '',
    eigene: kartenIn(spalte),
    zimmer: [...spalte.children]
      .filter((k) => k.tagName.toLowerCase() === 'ff-kanban-zimmer')
      .map((z) => ({ titel: z.getAttribute('titel') ?? '', karten: kartenIn(z) })),
  }))
}

async function tafelLaufImBrowser(): Promise<SpaltenStand[]> {
  const { html } = exportMask(tafelMaske(), 'Tafelmaske', [QUELLE], [])
  const ablage = path.resolve('node_modules/.tmp/tafel-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'tafel.html')
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    // Der Datenstand steht, bevor die Maske ihn sucht: sonst liefe ihre Suche
    // ins Leere und der Test saehe eine Tafel ohne Karten.
    await seite.addInitScript((zeilen: unknown[]) => {
      Object.assign(window, {
        SEDATA: { Daten: { SEFileLoop: [{ ALIAS: 'Positionen', Zeilen: zeilen }] } },
      })
    }, ZEILEN)
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(1200)
    return await seite.evaluate(tafelStand)
  } finally {
    await browser.close()
  }
}

// Die eine Sache, fuer die es die Tafel gibt: jede Zeile findet ihren Platz.
test('jede Zeile landet in ihrer Spalte, ihrer Unterteilung oder im Auffang', async () => {
  const [offen, inArbeit, rest] = await tafelLaufImBrowser()

  expect(offen.titel).toBe('Offen')
  expect(offen.eigene).toEqual(['Erste'])
  expect(offen.anzahl).toBe('1')

  expect(inArbeit.titel).toBe('In Arbeit')
  expect(inArbeit.eigene).toEqual([])
  expect(inArbeit.zimmer.map((z) => z.titel)).toEqual(['Meier', 'Schulz'])
  expect(inArbeit.zimmer.map((z) => z.karten)).toEqual([[], ['Zweite']])
  expect(inArbeit.anzahl).toBe('1')

  // 'X' kennt keine Spalte: die Auffangspalte faengt es.
  expect(rest.titel).toBe('Rest')
  expect(rest.eigene).toEqual(['Dritte'])
  expect(rest.anzahl).toBe('1')
}, 60_000)
