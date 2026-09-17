// Der Vertrag der Trennlinie: sie meldet keine Faehigkeit, ihre Werte gehen
// deutsch in den Export, und in der Maske zeichnet sie den gemeinten Strich.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { exportMask } from '../../export/exportMask'
import { CURRENT_SCHEMA_VERSION, hebeStand } from '../../editor/zustand/maskenSchema'
import { pruefeBaumStand } from '../../editor/zustand/ladeKette'
import { Trenner } from './Trenner'

function linie(id: string, werte: Record<string, unknown>): Record<string, unknown> {
  return { id, typ: Trenner.typ, werte, elternId: WURZEL_ID, kinderIds: [] }
}

function maskeMitLinien(...linien: Record<string, unknown>[]): Maskenbaum {
  const baum: Record<string, unknown> = {
    [WURZEL_ID]: {
      id: WURZEL_ID,
      typ: WURZEL_TYP,
      werte: {},
      elternId: null,
      kinderIds: linien.map((l) => l.id),
    },
  }
  for (const l of linien) baum[l.id as string] = l
  return baum as Maskenbaum
}

// Drei Linien: die Vorgabe, eine gestrichelte senkrechte und eine, die den
// Linienstil noch als CSS-Wort traegt wie eine schon exportierte Maske.
function trennerMaske(): Maskenbaum {
  return maskeMitLinien(
    linie('t1', { rasterX: 0, rasterY: 0, rasterW: 20, rasterH: 2 }),
    linie('t2', {
      rasterX: 0, rasterY: 3, rasterW: 2, rasterH: 8,
      richtung: 'senkrecht', stil: 'gestrichelt', staerke: 3, farbe: 'akzent',
    }),
    linie('t3', { rasterX: 6, rasterY: 3, rasterW: 20, rasterH: 2, stil: 'dotted' }),
  )
}

test('die Linie meldet eine leere Faehigkeitsliste und vier deutsche Angaben', () => {
  const art = bausteinArt(Trenner.typ)
  expect(art?.tag).toBe('ff-trenner')
  expect(art?.kategorie).toBe('layout')
  expect(Trenner.faehigkeiten).toEqual([])
  expect(art?.faehigkeiten).toEqual([])
  expect(Object.keys(Trenner.vorgaben)).toEqual(['richtung', 'stil', 'staerke', 'farbe'])
})

test('nur die geaenderten Angaben gehen als deutsche Attribute hinaus', () => {
  const { html } = exportMask(trennerMaske(), 'Trennermaske')

  expect(html).toContain('<ff-trenner richtung="senkrecht" stil="gestrichelt" staerke="3" farbe="akzent"')
  // Was auf der Vorgabe steht, schreibt der Export nicht mit.
  expect(html).toContain('<ff-trenner data-ff-hauptinhalt')
  expect(html).not.toContain('stil="durchgezogen"')
  expect(html).not.toContain(' width=')
})

// Ohne Hebung stuende die Wahl im Inspector auf keiner Zeile. Format 11 steht
// fuer die gespeicherten Masken des Nutzers, 14 fuer den Stand vor diesem
// Umbau; „width" trug die Linie damals mit und darf sie nicht mehr aufhalten.
test.each([11, 14])('eine Trennlinie aus Format %i laedt mit dem deutschen Stil', (version) => {
  const alt = {
    schemaVersion: version,
    tree: maskeMitLinien(linie('tr1', {
      width: 'fill', richtung: 'senkrecht', stil: 'dashed', staerke: 2, farbe: 'akzent',
    })),
  }
  const gehoben = hebeStand(alt) as { schemaVersion: number; tree: Record<string, unknown> }
  expect(gehoben.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

  const stand = pruefeBaumStand(gehoben as never)
  expect(stand.art, stand.art === 'abgelehnt' ? stand.probleme[0]?.grund : '').toBe('ok')
  expect(stand.art === 'ok' && stand.baum.tree.tr1.werte.stil).toBe('gestrichelt')
  expect(stand.art === 'ok' && stand.baum.tree.tr1.werte.staerke).toBe(2)
  expect(stand.art === 'ok' && stand.baum.tree.tr1.werte.richtung).toBe('senkrecht')
})

interface Strichbild {
  stil: string
  breite: string
  lage: string
}

// Laeuft IM Browser: nur was dort gerechnet wird, zaehlt hier.
function strichbilder(): Strichbild[] {
  return [...document.querySelectorAll('ff-trenner')].map((el) => {
    const flaeche = el.shadowRoot?.querySelector('.flaeche')
    const strich = el.shadowRoot?.querySelector('.linie')
    if (!flaeche || !strich) return { stil: '', breite: '', lage: '' }
    const senkrecht = flaeche.classList.contains('senkrecht')
    const gerechnet = getComputedStyle(strich)
    return {
      stil: senkrecht ? gerechnet.borderLeftStyle : gerechnet.borderTopStyle,
      breite: senkrecht ? gerechnet.borderLeftWidth : gerechnet.borderTopWidth,
      lage: flaeche.getAttribute('aria-orientation') ?? '',
    }
  })
}

async function strichlaufImBrowser(): Promise<Strichbild[]> {
  const { html } = exportMask(trennerMaske(), 'Trennermaske')
  const ablage = path.resolve('node_modules/.tmp/trenner-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'trenner.html')
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(500)
    return await seite.evaluate(strichbilder)
  } finally {
    await browser.close()
  }
}

test('die Maske zeichnet den Strich, den die deutschen Werte meinen', async () => {
  const [vorgabe, senkrecht, altesWort] = await strichlaufImBrowser()

  expect(vorgabe).toEqual({ stil: 'solid', breite: '1px', lage: 'horizontal' })
  expect(senkrecht).toEqual({ stil: 'dashed', breite: '3px', lage: 'vertical' })
  // Eine Maske von vor der Umbenennung darf nicht stumm durchgezogen werden.
  expect(altesWort.stil).toBe('dotted')
}, 60_000)
