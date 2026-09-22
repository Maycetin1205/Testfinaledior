// Der Vertrag der neuen Tafel: ein Baustein ohne Kinder, deutsche Attribute im
// Export, und in der Maske landet jede Zeile dort, wo ihre Felder hinzeigen.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { exportMask } from '../../export/exportMask'
import { ablageFuer, ablageWerte, naechsteAblage, zeigtAuf, type TafelSpalte } from '../faehigkeiten/tafelSpalten'
import { vergleicheKarten, type KartenWerte } from '../faehigkeiten/tafelKarte'
import { tierVon } from '../faehigkeiten/tierSymbol'
import { Tafel } from './Tafel'

const QUELLE = {
  id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [
    { code: '18_25', name: 'Status' },
    { code: '30_10', name: 'Mitarbeiter' },
    { code: '45_60', name: 'Bezeichnung' },
    { code: '50_10', name: 'Datum' },
  ],
} as const

const OHNE: Pick<TafelSpalte, 'unterteilungsFeld' | 'unterteilungen' | 'versteckt' | 'knopf'> = {
  unterteilungsFeld: '', unterteilungen: [], versteckt: 'nein', knopf: '',
}

const SPALTEN: TafelSpalte[] = [
  { ...OHNE, titel: 'Offen', farbwelt: 'warning', wert: 'A', auffang: 'nein' },
  {
    ...OHNE, titel: 'In Arbeit', farbwelt: 'info', wert: 'B', auffang: 'nein', unterteilungsFeld: '30_10',
    unterteilungen: [{ titel: 'Meier', wert: 'Z1' }, { titel: 'Schulz', wert: 'Z2' }],
  },
  { ...OHNE, titel: 'Rest', farbwelt: 'success', wert: '', auffang: 'ja' },
]

// Der Aufbau der handgebauten Empfangsmaske: ein Feld (Zimmer, 253_30) traegt
// Status und Raum zugleich; leer heisst „noch nicht da“, „Erledigt“ erscheint nicht.
const ZIMMER = '253_30'
const EMPFANG: TafelSpalte[] = [
  { ...OHNE, titel: 'Termine heute', farbwelt: 'neutral', wert: '', auffang: 'ja', knopf: 'Anmelden →' },
  { ...OHNE, titel: 'Wartezimmer', farbwelt: 'warning', wert: 'Wartezimmer', auffang: 'nein', knopf: 'Ins Zimmer →' },
  {
    ...OHNE, titel: 'In Behandlung', farbwelt: 'info', wert: '', auffang: 'nein', unterteilungsFeld: ZIMMER,
    knopf: 'Zur Kasse →',
    unterteilungen: [1, 2, 3, 4].map((n) => ({ titel: `Zimmer ${n}`, wert: `Behandlungszimmer ${n}` })),
  },
  { ...OHNE, titel: 'Zur Kasse', farbwelt: 'success', wert: 'Abrechnung', auffang: 'nein' },
  { ...OHNE, titel: 'Erledigt', farbwelt: 'neutral', wert: 'Erledigt', auffang: 'nein', versteckt: 'ja' },
]

function tafelMaske(): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['t1'] },
    t1: {
      id: 't1',
      typ: Tafel.typ,
      werte: {
        rasterX: 0, rasterY: 0, rasterW: 40, rasterH: 16,
        quelle: 'q1', spaltenFeld: '18_25', spalten: SPALTEN, titelFeld: '45_60', datumFeld: '50_10',
      },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

const ZEILEN = [
  { '645_10': '1', '18_25': 'A', '30_10': '', '45_60': 'Erste', '50_10': '' },
  { '645_10': '2', '18_25': 'B', '30_10': 'Z2', '45_60': 'Zweite', '50_10': '01.10.2026' },
  { '645_10': '3', '18_25': 'X', '30_10': '', '45_60': 'Dritte', '50_10': '' },
]

test('die Tafel ist ein Baustein ohne Kinder und meldet ihre Faehigkeiten', () => {
  const art = bausteinArt(Tafel.typ)
  expect(art?.tag).toBe('ff-tafel')
  expect(art?.name).toBe('Kanban (neu)')
  expect(art?.nimmtKinder).toBe(false)
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual(['quelle', 'satzwahl', 'ereignisse'])
  expect(faehigkeit(art, 'ereignisse')?.liste.map((e) => e.schluessel)).toEqual(['onCardClick', 'onCardDrop'])
})

test('eine Zeile findet Spalte, Unterteilung oder Auffang, und der Umzug nennt VALUE und ZIMMER', () => {
  const lies = (zeile: Record<string, string>) => (feld: string) => zeile[feld] ?? ''
  expect(ablageFuer(SPALTEN, '18_25', lies(ZEILEN[0]))).toEqual({ spalte: 0, unterteilung: -1 })
  expect(ablageFuer(SPALTEN, '18_25', lies(ZEILEN[1]))).toEqual({ spalte: 1, unterteilung: 1 })
  expect(ablageFuer(SPALTEN, '18_25', lies(ZEILEN[2]))).toEqual({ spalte: 2, unterteilung: -1 })
  expect(ablageWerte(SPALTEN, '18_25', { spalte: 1, unterteilung: 0 })).toEqual({ VALUE: 'B', ZIMMER: 'Z1' })
  // Die Auffangspalte ohne eigenen Wert leert das Feld, statt ihren Titel zu schreiben.
  expect(ablageWerte(SPALTEN, '18_25', { spalte: 2, unterteilung: -1 })).toEqual({ VALUE: '', ZIMMER: '' })
})

test('die Empfangsmaske: ein Feld traegt Status und Zimmer, der Knopf nimmt das erste freie Zimmer', () => {
  const ablage = (wert: string) => ablageFuer(EMPFANG, ZIMMER, (f) => (f === ZIMMER ? wert : ''))
  expect(ablage('')).toEqual({ spalte: 0, unterteilung: -1 })
  expect(ablage('wartezimmer')).toEqual({ spalte: 1, unterteilung: -1 })
  expect(ablage('Behandlungszimmer 3')).toEqual({ spalte: 2, unterteilung: 2 })
  expect(ablage('Abrechnung')).toEqual({ spalte: 3, unterteilung: -1 })
  expect(ablage('Erledigt')).toEqual({ spalte: 4, unterteilung: -1 })

  // Ins Zimmer geht als VALUE der Wert, den das Feld danach traegt.
  expect(ablageWerte(EMPFANG, ZIMMER, { spalte: 2, unterteilung: 2 }))
    .toEqual({ VALUE: 'Behandlungszimmer 3', ZIMMER: 'Behandlungszimmer 3' })
  expect(zeigtAuf(EMPFANG, ZIMMER, { spalte: 2, unterteilung: 2 }, () => 'Behandlungszimmer 3')).toBe(true)
  expect(zeigtAuf(EMPFANG, ZIMMER, { spalte: 0, unterteilung: -1 }, () => '')).toBe(true)

  const belegt = (a: { spalte: number; unterteilung: number }) => (a.spalte === 2 && a.unterteilung < 2 ? 1 : 0)
  expect(naechsteAblage(EMPFANG, { spalte: 0, unterteilung: -1 }, belegt)).toEqual({ spalte: 1, unterteilung: -1 })
  expect(naechsteAblage(EMPFANG, { spalte: 1, unterteilung: -1 }, belegt)).toEqual({ spalte: 2, unterteilung: 2 })
  // Hinter der Kasse liegt nur die ausgeblendete Spalte: dorthin fuehrt kein Knopf.
  expect(naechsteAblage(EMPFANG, { spalte: 3, unterteilung: -1 }, belegt)).toBeNull()
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

test('der Export traegt die Spalten als ein Attribut und bestellt jedes gebundene Feld', () => {
  const { html, sevariablen } = exportMask(tafelMaske(), 'Tafelmaske', [QUELLE], [])
  const tafel = /<ff-tafel [^>]*>/.exec(html)?.[0] ?? ''
  expect(tafel).toContain(' spaltenfeld="18_25"')
  expect(tafel).toContain(' titelfeld="45_60"')
  expect(tafel).toContain(' spalten="[{')
  expect(tafel).toContain('&quot;titel&quot;:&quot;Offen&quot;')
  expect(html).not.toContain('<ff-karte')
  expect(html).not.toContain('<ff-kanban')
  // Das Feld „Unterteilen nach“ steht nur in einer Spalte, muss aber mit.
  for (const code of ['18_25', '30_10', '45_60', '50_10']) expect(sevariablen).toContain(code)
})

interface SpaltenStand {
  titel: string
  anzahl: string
  eigene: string[]
  unterteilungen: { titel: string; karten: string[] }[]
}

// Laeuft IM Browser: nur was dort steht, zaehlt hier.
function tafelStand(): { spalten: SpaltenStand[]; datum: string[] } {
  const wurzel = document.querySelector('ff-tafel')?.shadowRoot
  const titel = (el: Element): string[] => [...el.querySelectorAll(':scope > .karte .name')]
    .map((n) => n.textContent?.trim() ?? '')
  const spalten = [...(wurzel?.querySelectorAll('.spalte') ?? [])].map((spalte) => ({
    titel: spalte.querySelector('.spaltenkopf .titel')?.textContent?.trim() ?? '',
    anzahl: spalte.querySelector('.anzahl')?.textContent?.trim() ?? '',
    eigene: [...spalte.querySelectorAll(':scope > .rumpf')].flatMap(titel),
    unterteilungen: [...spalte.querySelectorAll('.unterteilung')].map((u) => ({
      titel: u.querySelector('.unterkopf span')?.textContent?.trim() ?? '',
      karten: [...u.querySelectorAll('.unterrumpf')].flatMap(titel),
    })),
  }))
  const datum = [...(wurzel?.querySelectorAll('.datum') ?? [])].map((d) => d.textContent?.trim() ?? '')
  return { spalten, datum }
}

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
        Object.assign(window, { SEDATA: { Daten: { SEFileLoop: [{ ALIAS: 'Positionen', Zeilen: z }] } } })
      }, zeilen)
    }
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(1200)
    return await seite.evaluate(fn)
  } finally {
    await browser.close()
  }
}

test('in der Maske liegt jede Zeile als Karte an ihrem Platz, leere Stellen fehlen', async () => {
  const { spalten: [offen, inArbeit, rest], datum } = await imBrowser(tafelStand, ZEILEN)

  expect(offen).toMatchObject({ titel: 'Offen', anzahl: '1', eigene: ['Erste'] })
  expect(inArbeit.anzahl).toBe('1')
  expect(inArbeit.unterteilungen).toEqual([
    { titel: 'Meier', karten: [] },
    { titel: 'Schulz', karten: ['Zweite'] },
  ])
  expect(rest).toMatchObject({ titel: 'Rest', anzahl: '1', eigene: ['Dritte'] })
  // Nur die Karte mit Datum zeigt eines; keine erfindet einen Wert.
  expect(datum).toEqual(['01.10.2026'])
}, 60_000)

// Der Editor hat keine Daten: je Ablage eine Karte in ihrer Form, mit Strichen.
// Laeuft IM Browser und darf darum nichts von aussen rufen.
async function editorStand(): Promise<{ karten: number; stellen: string[]; anzahl: string[] }> {
  const tafel = document.querySelector('ff-tafel') as (HTMLElement & { requestUpdate: () => void }) | null
  tafel?.setAttribute('data-ff-editor', '')
  tafel?.requestUpdate()
  await new Promise((r) => setTimeout(r, 50))
  const wurzel = tafel?.shadowRoot
  return {
    karten: wurzel?.querySelectorAll('.karte').length ?? 0,
    stellen: [...(wurzel?.querySelector('.karte')?.querySelectorAll('[data-ff-spot]') ?? [])]
      .map((s) => `${s.getAttribute('data-ff-spot')}=${s.textContent?.trim() ?? ''}`),
    anzahl: [...(wurzel?.querySelectorAll('.anzahl') ?? [])].map((a) => a.textContent?.trim() ?? ''),
  }
}

test('im Editor stehen Karten in der Form der Maske, mit Strichen statt Werten', async () => {
  const stand = await imBrowser(editorStand, null)
  // Offen, Meier, Schulz, Rest: vier Ablagen, vier Karten.
  expect(stand.karten).toBe(4)
  expect(stand.stellen).toEqual(['titel=—', 'datum=—'])
  expect(stand.anzahl).toEqual(['—', '—', '—'])
}, 60_000)

// Laeuft IM Browser: Karte waehlen, per Zielwahl verschieben, Meldung lesen.
async function umzugPerWahl(): Promise<{ gewaehlt: string; meldung: string }> {
  const wurzel = document.querySelector('ff-tafel')?.shadowRoot
  const warte = (): Promise<unknown> => new Promise((r) => setTimeout(r, 50))
  wurzel?.querySelector<HTMLElement>('.karte')?.click()
  await warte()
  const wahl = wurzel?.querySelector('select')
  const gewaehlt = wurzel?.querySelector('.karte.gewaehlt .name')?.textContent?.trim() ?? ''
  if (wahl) {
    wahl.value = '2:-1'
    wahl.dispatchEvent(new Event('change'))
  }
  await warte()
  return { gewaehlt, meldung: wurzel?.querySelector('.meldung')?.textContent?.trim() ?? '' }
}

test('eine gewaehlte Karte laesst sich ohne Zeiger verschieben und sagt, was fehlt', async () => {
  const stand = await imBrowser(umzugPerWahl, ZEILEN)
  expect(stand.gewaehlt).toBe('Erste')
  expect(stand.meldung).toBe('Für „Karte verschoben“ ist noch keine Aktion eingerichtet.')
}, 60_000)

function empfangMaske(): Maskenbaum {
  const baum = tafelMaske()
  baum.t1 = {
    ...baum.t1,
    werte: {
      ...baum.t1.werte, spaltenFeld: ZIMMER, spalten: EMPFANG, titelFeld: '45_60', datumFeld: '',
      bildFeld: '30_10', bildArt: 'tier', markeFeld: '18_25', marken: [{ wert: 'Notfall', farbwelt: 'danger' }],
    },
  }
  return baum
}

const EMPFANG_ZEILEN = [
  { '645_10': '1', [ZIMMER]: '', '30_10': 'Katze', '18_25': '', '45_60': 'Minka' },
  { '645_10': '2', [ZIMMER]: 'Behandlungszimmer 2', '30_10': 'Hund', '18_25': 'Notfall', '45_60': 'Rocky' },
  { '645_10': '3', [ZIMMER]: 'Erledigt', '30_10': 'Hund', '18_25': '', '45_60': 'Bello' },
]

// Laeuft IM Browser: was die Empfangstafel zeigt, und was ihr Weiter-Knopf meldet.
async function empfangStand(): Promise<{ spalten: string[]; karten: string[]; meldung: string }> {
  const wurzel = document.querySelector('ff-tafel')?.shadowRoot
  const spalten = [...(wurzel?.querySelectorAll('.spaltenkopf .titel') ?? [])].map((t) => t.textContent?.trim() ?? '')
  const karten = [...(wurzel?.querySelectorAll('.karte') ?? [])].map((k) => [
    k.querySelector('.name')?.textContent?.trim(),
    k.querySelector('.bild.tier') ? 'Symbol' : 'ohne',
    k.classList.contains('hervor') ? 'hervor' : '',
    k.querySelector('.marke')?.textContent?.trim() ?? '',
    k.querySelector('.weiter')?.textContent?.trim() ?? '',
  ].join('|'))
  wurzel?.querySelector<HTMLButtonElement>('.weiter')?.click()
  await new Promise((r) => setTimeout(r, 50))
  return { spalten, karten, meldung: wurzel?.querySelector('.meldung')?.textContent?.trim() ?? '' }
}

test('die Empfangstafel blendet Erledigtes aus, zeigt Tiersymbol und Notfall und schiebt per Knopf weiter', async () => {
  const stand = await imBrowser(empfangStand, EMPFANG_ZEILEN, empfangMaske())
  expect(stand.spalten).toEqual(['Termine heute', 'Wartezimmer', 'In Behandlung', 'Zur Kasse'])
  expect(stand.karten).toEqual([
    'Minka|Symbol|||Anmelden →',
    'Rocky|Symbol|hervor|Notfall|Zur Kasse →',
  ])
  expect(stand.meldung).toBe('Für „Karte verschoben“ ist noch keine Aktion eingerichtet.')
}, 60_000)
