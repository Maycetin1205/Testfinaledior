// Der Vertrag der Schaltflaeche mit Export, Maske und altem Maskenstand: die
// Beschriftung heisst ueberall so, und der Zaehler zeigt offene Vormerkungen.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { bausteinArt } from '../../kern/maske/registry'
import type { RelationsVorlage } from '../../kern/daten/relationen'
import { BAUSTEIN_ID_ATTR, type Schritt } from '../../kern/daten/aktionen'
import { VORMERK_EVENT } from '../faehigkeiten/vormerkStand'
import { exportMask } from '../../export/exportMask'
import { pruefeBaumStand } from '../../editor/zustand/ladeKette'
import { CURRENT_SCHEMA_VERSION, hebeStand } from '../../editor/zustand/maskenSchema'
import { Button } from './Button'

const RELATION: RelationsVorlage = {
  id: 'r1', name: 'Feld schreiben', verb: 'PUT_RELATION', nr: '174',
  parameter: ['{PINDEX}', '164_8'],
}

// Die Kette schreibt je erfasster Zeile der Liste „e1": genau daran zaehlt der
// Knopf, wie viele Laeufe er vor sich hat.
const KETTE: Schritt[] = [{
  id: 's1',
  art: 'RELATION',
  ergebnisName: '',
  relationId: 'r1',
  parameter: [
    { quelle: 'context', wert: 'PINDEX' },
    { quelle: 'erfassungszelle', wert: 'sp-menge', bausteinId: 'e1' },
  ],
  zusatzParameter: [],
}]

function maskeMitKnopf(werte: Record<string, unknown> = {}, mitKette = false): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['b1'] },
    b1: {
      id: 'b1',
      typ: Button.typ,
      werte: { rasterX: 0, rasterY: 0, rasterW: 8, rasterH: 3, ...werte },
      elternId: WURZEL_ID,
      kinderIds: [],
      ...(mitKette ? { ketten: { onClick: KETTE } } : {}),
    },
  } as Maskenbaum
}

function knopfTag(werte: Record<string, unknown>): string {
  const { html } = exportMask(maskeMitKnopf(werte), 'Test', [], [])
  return /<ff-button[^>]*>/.exec(html)?.[0] ?? ''
}

test('die Schaltflaeche meldet sich mit deutscher Eigenschaft und ihrer Faehigkeit an', () => {
  const art = bausteinArt(Button.typ)
  expect(art?.tag).toBe('ff-button')
  expect(Object.keys(Button.vorgaben)).toEqual(['beschriftung'])
  expect(Button.eigenschaften).toEqual([])
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual(['ereignisse'])
  expect(faehigkeit(art, 'ereignisse')?.liste.map((e) => e.schluessel)).toEqual(['onClick'])
})

test('die Beschriftung erreicht den Export unter ihrem Namen', () => {
  const tag = knopfTag({ beschriftung: 'Speichern' })
  expect(tag).toContain(' beschriftung="Speichern"')
  expect(tag).not.toContain(' label=')

  // Was auf der Vorgabe steht, schreibt der Export nicht mit.
  expect(knopfTag({})).not.toContain(' beschriftung=')
})

// Ohne Hebung faende der Lader am Knopf einen Schluessel, den es nicht mehr
// gibt, und verwuerfe die ganze Maske als Verlust. Format 10 steht dabei fuer
// die gespeicherten Masken des Nutzers, 12 fuer den Stand vor diesem Umbau.
test.each([10, 12])('eine Maske im Format %i mit label laedt weiter', (version) => {
  const alt = { schemaVersion: version, tree: maskeMitKnopf({ label: 'Schreiben' }) }
  const gehoben = hebeStand(alt) as { schemaVersion: number; tree: Record<string, unknown> }
  expect(gehoben.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

  const stand = pruefeBaumStand(gehoben as never)
  expect(stand.art, stand.art === 'abgelehnt' ? stand.probleme[0]?.grund : '').toBe('ok')
  expect(stand.art === 'ok' && stand.baum.tree.b1.werte.beschriftung).toBe('Schreiben')
  expect(stand.art === 'ok' && stand.baum.tree.b1.werte.label).toBe(undefined)
})

interface Knopf extends HTMLElement {
  updateComplete: Promise<boolean>
}

interface Traeger extends HTMLDivElement {
  erfassteZeilen: string[][]
}

async function knopfTexteImBrowser(): Promise<string[]> {
  const { html } = exportMask(maskeMitKnopf({ beschriftung: 'Speichern' }, true), 'Knopfmaske', [], [RELATION])
  const ablage = path.resolve('node_modules/.tmp/knopf-probe')
  mkdirSync(ablage, { recursive: true })
  const datei = path.join(ablage, 'knopf.html')
  writeFileSync(datei, html)

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const seite = await browser.newPage()
    await seite.goto('file:///' + datei.split(path.sep).join('/'))
    await seite.waitForTimeout(500)
    return await seite.evaluate(async (vertrag: { kennung: string; ereignis: string }) => {
      const el = document.querySelector('ff-button') as Knopf
      const text = async (): Promise<string> => {
        await el.updateComplete
        return el.shadowRoot?.querySelector('button')?.textContent?.trim() ?? ''
      }
      const ohneListe = await text()

      // Die Liste ist hier kein Baustein: gezaehlt wird allein, was ihr Vertrag
      // hergibt (erfassteZeilen) und was sie meldet.
      const traeger = document.createElement('div') as Traeger
      traeger.setAttribute(vertrag.kennung, 'e1')
      traeger.erfassteZeilen = []
      document.body.appendChild(traeger)
      const melde = (): void => {
        traeger.dispatchEvent(new CustomEvent(vertrag.ereignis, { bubbles: true, composed: true }))
      }
      melde()
      const leereListe = await text()

      traeger.erfassteZeilen = [['1'], ['2'], ['3']]
      melde()
      return [ohneListe, leereListe, await text()]
    }, { kennung: BAUSTEIN_ID_ATTR, ereignis: VORMERK_EVENT })
  } finally {
    await browser.close()
  }
}

// Der Knopf wird NIE abgeschaltet: ohne Vormerkung sagt die Kette im Balken,
// warum nichts hinausging.
test('der Knopf zeigt die Zahl der vorgemerkten Zeilen, null zeigt er nicht', async () => {
  const [ohneListe, leereListe, dreiZeilen] = await knopfTexteImBrowser()
  expect(ohneListe).toBe('Speichern')
  expect(leereListe).toBe('Speichern')
  expect(dreiZeilen).toBe('Speichern (3)')
}, 60_000)
