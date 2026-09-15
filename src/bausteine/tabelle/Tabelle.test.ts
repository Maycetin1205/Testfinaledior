// Der Vertrag der Tabelle mit Export und Maske: was der Editor einstellt, steht
// als Attribut im Export, und die Maske liest genau diese Namen.
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { exportMask } from '../../export/exportMask'
import { Tabelle } from './Tabelle'

const QUELLE = { id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [{ code: '18_25', name: 'ArtNr' }, { code: '5_8', name: 'Datum' }] } as const

function maskeMitTabelle(werte: Record<string, unknown>, ketten?: Record<string, unknown[]>): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['t1'] },
    t1: { id: 't1', typ: Tabelle.typ, werte, elternId: WURZEL_ID, kinderIds: [], ...(ketten ? { ketten } : {}) },
  } as Maskenbaum
}

test('die Tabelle meldet sich mit deutschen Eigenschaften und ihren Faehigkeiten an', () => {
  const art = bausteinArt(Tabelle.typ)
  expect(art?.tag).toBe('ff-tabelle')
  expect(Object.keys(Tabelle.vorgaben)).toEqual(
    ['quelle', 'spalten', 'suche', 'blaettern', 'kopfzeile', 'spaltenwahl', 'tagFeld', 'leerText'],
  )
  expect((art?.faehigkeiten ?? []).map((f) => f.art))
    .toEqual(['quelle', 'satzwahl', 'auswahlFolgen', 'liste', 'ereignisse'])
  expect(faehigkeit(art, 'ereignisse')?.liste.map((e) => e.schluessel))
    .toEqual(['zeileGewaehlt', 'zeileDoppelt', 'tasteF4'])
})

test('Quelle, Tagesfeld, Spalten und Ereignisse erreichen den Export unter ihren Namen', () => {
  const { html } = exportMask(
    maskeMitTabelle(
      { quelle: 'q1', tagFeld: '5_8', spalten: [{ kennung: 's1', titel: 'ArtNr', feld: '18_25' }], suche: 'nein' },
      { zeileGewaehlt: [{ id: 'k1', art: 'BW_LINK', ergebnisName: '', befehl: '0,REFRESH' }] },
    ),
    'Test', [QUELLE], [],
  )
  const tabelle = /<ff-tabelle[^>]*>/.exec(html)?.[0] ?? ''
  expect(tabelle).toContain(' quelle="q1"')
  expect(tabelle).toContain(' tagfeld="5_8"')
  expect(tabelle).toContain(' suche="nein"')
  expect(tabelle).toContain('&quot;feld&quot;:&quot;18_25&quot;')
  expect(tabelle).toContain('zeileGewaehlt')
  expect(tabelle).not.toContain('source=')
  expect(tabelle).not.toContain(' width=')
})
