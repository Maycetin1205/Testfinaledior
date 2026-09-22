// Der Vertrag der neuen Tafel: ein Baustein ohne Kinder, jede Zeile auf genau
// einem Platz, jede Verschiebung mit Wert und Name des Ziel-Platzes.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { exportMask } from '../../export/exportMask'
import {
  ablageFuer,
  ablageWerte,
  naechsteAblage,
  tafelSpaltenLesen,
  traegtWert,
  type Platz,
  type TafelSpalte,
} from '../faehigkeiten/tafelSpalten'
import { vergleicheKarten, type KartenWerte } from '../faehigkeiten/tafelKarte'
import { tierVon } from '../faehigkeiten/tierSymbol'
import { Tafel } from './Tafel'

const ZIMMER = '253_30'

const QUELLE = {
  id: 'q1', name: 'Terminplaner', art: 'belegposition', satzFeld: '645_10',
  felder: [
    { code: ZIMMER, name: 'Zimmer' },
    { code: '45_60', name: 'Tiername' },
    { code: '30_10', name: 'Tierart' },
    { code: '18_25', name: 'Priorität' },
    { code: '50_10', name: 'Datum' },
  ],
} as const

const p = (name: string, wert: string, versteckt: Platz['versteckt'] = 'nein'): Platz => ({ name, wert, versteckt })

// Der Aufbau der handgebauten Empfangsmaske: ein Feld traegt Status und Zimmer
// zugleich; leer heisst „noch nicht da“, „Erledigt“ erscheint nicht.
const EMPFANG: TafelSpalte[] = [
  { titel: 'Termine heute', farbwelt: 'neutral', knopf: 'Anmelden →', plaetze: [p('Termine heute', '')] },
  { titel: 'Wartezimmer', farbwelt: 'warning', knopf: 'Ins Zimmer →', plaetze: [p('Wartezimmer', 'Wartezimmer')] },
  {
    titel: 'In Behandlung', farbwelt: 'info', knopf: 'Zur Kasse →',
    plaetze: [1, 2, 3, 4].map((n) => p(`Zimmer ${n}`, `Behandlungszimmer ${n}`)),
  },
  { titel: 'Zur Kasse', farbwelt: 'success', knopf: '', plaetze: [p('Zur Kasse', 'Abrechnung')] },
  { titel: 'Erledigt', farbwelt: 'neutral', knopf: '', plaetze: [p('Erledigt', 'Erledigt', 'ja')] },
]

function tafelMaske(werte: Record<string, unknown> = {}): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['t1'] },
    t1: {
      id: 't1',
      typ: Tafel.typ,
      werte: {
        rasterX: 0, rasterY: 0, rasterW: 40, rasterH: 16,
        quelle: 'q1', spaltenFeld: ZIMMER, spalten: EMPFANG, titelFeld: '45_60', datumFeld: '50_10', ...werte,
      },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

const ZEILEN = [
  { '645_10': '1', [ZIMMER]: '', '45_60': 'Minka', '30_10': 'Katze', '18_25': '', '50_10': '' },
  { '645_10': '2', [ZIMMER]: 'Behandlungszimmer 2', '45_60': 'Rocky', '30_10': 'Hund', '18_25': 'Notfall', '50_10': '01.10.2026' },
  { '645_10': '3', [ZIMMER]: 'unbekannt', '45_60': 'Hoppel', '30_10': 'Kaninchen', '18_25': '', '50_10': '' },
  { '645_10': '4', [ZIMMER]: 'Erledigt', '45_60': 'Bello', '30_10': 'Hund', '18_25': '', '50_10': '' },
]

test('die Tafel ist ein Baustein ohne Kinder und meldet ihre Faehigkeiten', () => {
  const art = bausteinArt(Tafel.typ)
  expect(art?.tag).toBe('ff-tafel')
  expect(art?.name).toBe('Kanban (neu)')
  expect(art?.nimmtKinder).toBe(false)
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual(['quelle', 'satzwahl', 'ereignisse'])
  expect(faehigkeit(art, 'ereignisse')?.liste.map((e) => e.schluessel)).toEqual(['onCardClick', 'onCardDrop'])
})

test('jeder Wert hat genau einen Platz; Unbekanntes liegt beim Platz ohne Wert', () => {
  expect(ablageFuer(EMPFANG, '')).toEqual({ spalte: 0, platz: 0 })
  expect(ablageFuer(EMPFANG, 'wartezimmer')).toEqual({ spalte: 1, platz: 0 })
  expect(ablageFuer(EMPFANG, 'Behandlungszimmer 3')).toEqual({ spalte: 2, platz: 2 })
  expect(ablageFuer(EMPFANG, 'Erledigt')).toEqual({ spalte: 4, platz: 0 })
  expect(ablageFuer(EMPFANG, 'unbekannt')).toEqual({ spalte: 0, platz: 0 })

  // Jede Verschiebung gibt Wert und Name des Ziel-Platzes an die Aktion.
  expect(ablageWerte(EMPFANG, { spalte: 2, platz: 2 })).toEqual({ VALUE: 'Behandlungszimmer 3', PLATZ: 'Zimmer 3' })
  expect(ablageWerte(EMPFANG, { spalte: 0, platz: 0 })).toEqual({ VALUE: '', PLATZ: 'Termine heute' })
  // Bestaetigt ist erst der Wert selbst, nicht das Liegen als Unbekannte.
  expect(traegtWert(EMPFANG, { spalte: 0, platz: 0 }, '')).toBe(true)
  expect(traegtWert(EMPFANG, { spalte: 0, platz: 0 }, 'unbekannt')).toBe(false)
})

test('der Knopf auf der Karte nimmt den ersten freien Platz der naechsten Spalte', () => {
  const belegt = (a: { spalte: number; platz: number }) => (a.spalte === 2 && a.platz < 2 ? 1 : 0)
  expect(naechsteAblage(EMPFANG, { spalte: 0, platz: 0 }, belegt)).toEqual({ spalte: 1, platz: 0 })
  expect(naechsteAblage(EMPFANG, { spalte: 1, platz: 0 }, belegt)).toEqual({ spalte: 2, platz: 2 })
  // Hinter der Kasse liegt nur ein Platz, der nicht gezeigt wird.
  expect(naechsteAblage(EMPFANG, { spalte: 3, platz: 0 }, belegt)).toBeNull()
})

// Der erste Stand dieses Zweigs speicherte Spalten mit Wert, Auffang und Unterteilungen.
test('eine gesicherte Tafel aus dem ersten Stand laedt als Spalten mit Plaetzen', () => {
  const alt = [
    { titel: 'Offen', farbwelt: 'warning', wert: '', auffang: 'ja', unterteilungsFeld: '', unterteilungen: [] },
    { titel: 'In Arbeit', farbwelt: 'info', wert: '', auffang: 'nein', unterteilungsFeld: '30_10',
      unterteilungen: [{ titel: 'Meier', wert: 'Z1' }, { titel: 'Schulz', wert: '' }] },
    { titel: 'Fertig', farbwelt: 'success', wert: '', auffang: 'nein', versteckt: 'ja' },
  ]
  expect(tafelSpaltenLesen(alt).map((s) => s.plaetze)).toEqual([
    [p('Offen', '')],
    [p('Meier', 'Z1'), p('Schulz', 'Schulz')],
    [p('Fertig', 'Fertig', 'ja')],
  ])
})

test('Karten stehen nach Markierung, dann nach Uhrzeit; die Tierart findet ihr Symbol', () => {
  const karte = (marke: string, sortierung: string) => ({ marke, sortierung } as KartenWerte & { sortierung: string })
  const marken = [{ wert: 'Notfall', farbwelt: 'danger' as const }, { wert: 'OP', farbwelt: 'warning' as const }]
  const reihe = [karte('', '9:30'), karte('OP', '14:00'), karte('', '10:15'), karte('notfall', '15:00')]
    .sort((a, b) => vergleicheKarten(a, b, marken))
    .map((k) => `${k.marke}${k.sortierung}`)
  expect(reihe).toEqual(['notfall15:00', 'OP14:00', '9:30', '10:15'])
  expect(['Zwergkaninchen', 'Kater', 'Wellensittich', 'Leguan'].map(tierVon))
    .toEqual(['kaninchen', 'katze', 'vogel', 'sonst'])
})

test('der Export traegt Spalten und Plaetze als ein Attribut und bestellt jedes gebundene Feld', () => {
  const { html, sevariablen } = exportMask(tafelMaske(), 'Tafelmaske', [QUELLE], [])
  const tafel = /<ff-tafel [^>]*>/.exec(html)?.[0] ?? ''
  expect(tafel).toContain(` spaltenfeld="${ZIMMER}"`)
  expect(tafel).toContain(' titelfeld="45_60"')
  expect(tafel).toContain('&quot;plaetze&quot;:[{&quot;name&quot;:&quot;Zimmer 1&quot;')
  expect(html).not.toContain('<ff-karte')
  for (const code of [ZIMMER, '45_60', '50_10']) expect(sevariablen).toContain(code)
})

async function imBrowser<T>(fn: () => T, zeilen: unknown[] | null, baum = tafelMaske()): Promise<T> {
  const { html } = exportMask(baum, 'Tafelmaske', [QUELLE], [])
  const ablage = path.resolve('node_modules/.tmp/tafel-neu-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'tafel.html')
  writeFileSync(datei, html)
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    if (zeilen) {
      await seite.addInitScript((z: unknown[]) => {
        Object.assign(window, { SEDATA: { Daten: { SEFileLoop: [{ ALIAS: 'Terminplaner', Zeilen: z }] } } })
      }, zeilen)
    }
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(1200)
    return await seite.evaluate(fn)
  } finally {
    await browser.close()
  }
}

interface SpaltenStand {
  titel: string
  anzahl: string
  eigene: string[]
  plaetze: { name: string; karten: string[] }[]
}

// Laeuft IM Browser: nur was dort steht, zaehlt hier.
function tafelStand(): { spalten: SpaltenStand[]; datum: string[] } {
  const wurzel = document.querySelector('ff-tafel')?.shadowRoot
  const namen = (el: Element): string[] => [...el.querySelectorAll(':scope > .karte .name')]
    .map((n) => n.textContent?.trim() ?? '')
  const spalten = [...(wurzel?.querySelectorAll('.spalte') ?? [])].map((spalte) => ({
    titel: spalte.querySelector('.spaltenkopf .titel')?.textContent?.trim() ?? '',
    anzahl: spalte.querySelector('.anzahl')?.textContent?.trim() ?? '',
    eigene: [...spalte.querySelectorAll(':scope > .rumpf')].flatMap(namen),
    plaetze: [...spalte.querySelectorAll('.platz')].map((pl) => ({
      name: pl.querySelector('.platzkopf span')?.textContent?.trim() ?? '',
      karten: [...pl.querySelectorAll('.platzrumpf')].flatMap(namen),
    })),
  }))
  const datum = [...(wurzel?.querySelectorAll('.datum') ?? [])].map((d) => d.textContent?.trim() ?? '')
  return { spalten, datum }
}

test('in der Maske liegt jede Karte auf ihrem Platz; Verstecktes und leere Stellen fehlen', async () => {
  const { spalten, datum } = await imBrowser(tafelStand, ZEILEN)
  expect(spalten.map((s) => s.titel)).toEqual(['Termine heute', 'Wartezimmer', 'In Behandlung', 'Zur Kasse'])
  expect(spalten[0]).toMatchObject({ anzahl: '2', eigene: ['Minka', 'Hoppel'], plaetze: [] })
  expect(spalten[1]).toMatchObject({ anzahl: '0', eigene: [] })
  expect(spalten[2].anzahl).toBe('1')
  expect(spalten[2].plaetze).toEqual([
    { name: 'Zimmer 1', karten: [] },
    { name: 'Zimmer 2', karten: ['Rocky'] },
    { name: 'Zimmer 3', karten: [] },
    { name: 'Zimmer 4', karten: [] },
  ])
  expect(datum).toEqual(['01.10.2026'])
}, 60_000)

// Der Editor hat keine Daten: je Platz eine Karte in ihrer Form, mit Strichen;
// der versteckte Platz steht blass da. Laeuft IM Browser.
async function editorStand(): Promise<{ karten: number; stellen: string[]; blass: string[] }> {
  const tafel = document.querySelector('ff-tafel') as (HTMLElement & { requestUpdate: () => void }) | null
  tafel?.setAttribute('data-ff-editor', '')
  tafel?.requestUpdate()
  await new Promise((r) => setTimeout(r, 50))
  const wurzel = tafel?.shadowRoot
  return {
    karten: wurzel?.querySelectorAll('.karte').length ?? 0,
    stellen: [...(wurzel?.querySelector('.karte')?.querySelectorAll('[data-ff-spot]') ?? [])]
      .map((s) => `${s.getAttribute('data-ff-spot')}=${s.textContent?.trim() ?? ''}`),
    blass: [...(wurzel?.querySelectorAll('.versteckt .titel') ?? [])].map((t) => t.textContent?.trim() ?? ''),
  }
}

test('im Editor stehen Karten in der Form der Maske, mit Strichen statt Werten', async () => {
  const stand = await imBrowser(editorStand, null)
  // Termine heute, Wartezimmer, vier Zimmer, Kasse, Erledigt.
  expect(stand.karten).toBe(8)
  expect(stand.stellen).toEqual(['titel=—', 'datum=—'])
  expect(stand.blass).toEqual(['Erledigt'])
}, 60_000)

// Laeuft IM Browser: was die Karten zeigen, und was Knopf und Zielwahl melden.
async function bedienStand(): Promise<{ karten: string[]; knopf: string; wahl: string }> {
  const wurzel = document.querySelector('ff-tafel')?.shadowRoot
  const warte = (): Promise<unknown> => new Promise((r) => setTimeout(r, 50))
  const karten = [...(wurzel?.querySelectorAll('.karte') ?? [])].map((k) => [
    k.querySelector('.name')?.textContent?.trim(),
    k.querySelector('.bild.tier') ? 'Symbol' : 'ohne',
    k.classList.contains('hervor') ? 'hervor' : '',
    k.querySelector('.marke')?.textContent?.trim() ?? '',
    k.querySelector('.weiter')?.textContent?.trim() ?? '',
  ].join('|'))
  wurzel?.querySelector<HTMLButtonElement>('.weiter')?.click()
  await warte()
  const knopf = wurzel?.querySelector('.meldung')?.textContent?.trim() ?? ''
  wurzel?.querySelector<HTMLElement>('.karte')?.click()
  await warte()
  const wahl = wurzel?.querySelector('select')
  if (wahl) {
    wahl.value = '1:0'
    wahl.dispatchEvent(new Event('change'))
  }
  await warte()
  return { karten, knopf, wahl: wahl ? 'da' : 'fehlt' }
}

test('Karten zeigen Tiersymbol und Notfall; Knopf und Zielwahl laufen ueber „Karte verschoben“', async () => {
  const baum = tafelMaske({
    bildFeld: '30_10', bildArt: 'tier', markeFeld: '18_25', marken: [{ wert: 'Notfall', farbwelt: 'danger' }],
  })
  const stand = await imBrowser(bedienStand, ZEILEN, baum)
  expect(stand.karten).toEqual([
    'Minka|Symbol|||Anmelden →',
    'Hoppel|Symbol|||Anmelden →',
    'Rocky|Symbol|hervor|Notfall|Zur Kasse →',
  ])
  expect(stand.knopf).toBe('Für „Karte verschoben“ ist noch keine Aktion eingerichtet.')
  expect(stand.wahl).toBe('da')
}, 60_000)
