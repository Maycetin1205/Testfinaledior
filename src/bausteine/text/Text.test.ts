// Der Vertrag des Textes mit Export, Maske und alten Masken: was der Editor
// einstellt, steht als Attribut im Export, und gespeicherte Masken laden weiter.
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { bausteinArt } from '../../kern/maske/registry'
import { exportMask } from '../../export/exportMask'
import { pruefeBaumStand } from '../../editor/zustand/ladeKette'
import { CURRENT_SCHEMA_VERSION, hebeStand } from '../../editor/zustand/maskenSchema'
import { Text } from './Text'

const QUELLE = {
  id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [{ code: '18_25', name: 'ArtNr' }, { code: '45_60', name: 'Bezeichnung' }],
} as const

function maskeMitText(werte: Record<string, unknown>): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['tx1'] },
    tx1: {
      id: 'tx1',
      typ: Text.typ,
      werte: { rasterX: 0, rasterY: 0, rasterW: 12, rasterH: 2, ...werte },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

function textTag(werte: Record<string, unknown>): string {
  const { html } = exportMask(maskeMitText(werte), 'Test', [QUELLE], [])
  return /<ff-text[^>]*>/.exec(html)?.[0] ?? ''
}

test('der Text meldet sich mit deutschen Eigenschaften und seinen Faehigkeiten an', () => {
  const art = bausteinArt(Text.typ)
  expect(art?.tag).toBe('ff-text')
  expect(Object.keys(Text.vorgaben)).toEqual(
    ['groesse', 'gewicht', 'ausrichtung', 'farbe', 'text', 'quelle', 'textField'],
  )
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual(['quelle', 'auswahlFolgen', 'bindbar'])
  expect(faehigkeit(art, 'bindbar')?.stellen.map((s) => s.prop)).toEqual(['text'])
})

test('Text, Stil und Feldbindung erreichen den Export unter ihren Namen', () => {
  const tag = textTag({ text: 'Kopfzeile', groesse: 22, gewicht: 'fett', ausrichtung: 'mitte', farbe: 'danger' })
  expect(tag).toContain(' text="Kopfzeile"')
  expect(tag).toContain(' groesse="22"')
  expect(tag).toContain(' gewicht="fett"')
  expect(tag).toContain(' ausrichtung="mitte"')
  expect(tag).toContain(' farbe="danger"')
  expect(tag).not.toContain(' width=')
  expect(tag).not.toContain(' size=')

  const gebunden = textTag({ quelle: 'q1', textField: '45_60' })
  expect(gebunden).toContain(' quelle="q1"')
  expect(gebunden).toContain(' textfield="45_60"')
})

// Ein Text aus einer gespeicherten Maske trug „width" und eine Groesse als
// Wort. Beides muss laden, sonst steht der Bediener vor einer Maske, die der
// Editor ablehnt.
test('eine alte Maske mit Text laedt weiter', () => {
  const alt = {
    schemaVersion: 11,
    tree: maskeMitText({ width: 'fill', groesse: 'ueberschrift', text: 'Alt' }),
  }
  const gehoben = hebeStand(alt) as { schemaVersion: number; tree: Record<string, unknown> }
  expect(gehoben.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

  const stand = pruefeBaumStand(gehoben as never)
  expect(stand.art, stand.art === 'abgelehnt' ? stand.probleme[0]?.grund : '').toBe('ok')
  expect(stand.art === 'ok' && stand.baum.tree.tx1.werte.text).toBe('Alt')
  expect(stand.art === 'ok' && stand.baum.tree.tx1.werte.width).toBe('fill')
})
