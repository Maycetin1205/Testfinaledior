// Der Vertrag der Karte: sie ist die Vorlage ihrer Tafel, ihre Stellen heissen
// deutsch, und der Export macht aus ihr ein <template>.
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { exportMask } from '../../export/exportMask'
import { Karte } from './Karte'

const QUELLE = {
  id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [{ code: '45_60', name: 'Bezeichnung' }],
} as const

function tafelMitKarte(werte: Record<string, unknown>): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['k1'] },
    k1: {
      id: 'k1',
      typ: 'kanban',
      werte: { rasterX: 0, rasterY: 0, rasterW: 24, rasterH: 12, quelle: 'q1' },
      elternId: WURZEL_ID,
      kinderIds: ['c1', 's1'],
    },
    c1: { id: 'c1', typ: Karte.typ, werte, elternId: 'k1', kinderIds: [] },
    s1: { id: 's1', typ: 'kanban-spalte', werte: { titel: 'Offen' }, elternId: 'k1', kinderIds: [] },
  } as Maskenbaum
}

test('die Karte meldet sich mit deutschen Stellen an und haengt nur unter einer Tafel', () => {
  const art = bausteinArt(Karte.typ)
  expect(art?.tag).toBe('ff-karte')
  expect(art?.inPalette).toBe(false)
  expect(art?.erlaubteEltern).toEqual(['kanban'])
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual(['bindbar'])
  expect(faehigkeit(art, 'bindbar')?.stellen.map((s) => s.prop))
    .toEqual(['zeit', 'datum', 'titel', 'titel2', 'unterzeile', 'text', 'chip'])
  expect(Object.keys(Karte.vorgaben)).toEqual([
    'chipFarbwelt', 'titel', 'titel2', 'zeit', 'datum', 'unterzeile', 'text', 'chip',
    'titelField', 'titel2Field', 'zeitField', 'datumField', 'unterzeileField', 'textField', 'chipField',
  ])
})

test('der Export macht aus der Karte die Vorlage der Tafel, mit deutschen Attributen', () => {
  const { html } = exportMask(
    tafelMitKarte({ titel: 'Karte', titelField: '45_60', chip: 'Eilig', chipFarbwelt: 'warning' }),
    'Test', [QUELLE], [],
  )

  expect(html).toContain('<template data-ff-template>')
  const karte = /<ff-karte[^>]*>/.exec(html)?.[0] ?? ''
  expect(karte).toContain(' titel="Karte"')
  expect(karte).toContain(' titelfield="45_60"')
  expect(karte).toContain(' chip="Eilig"')
  expect(karte).toContain(' chipfarbwelt="warning"')

  // Was auf der Vorgabe steht, schreibt der Export nicht mit; die englischen
  // Namen von frueher stehen nirgends mehr.
  expect(karte).not.toContain(' zeit=')
  expect(karte).not.toContain(' text=')
  expect(karte).not.toContain('heading')
  expect(karte).not.toContain('chiptext')
  expect(html).not.toContain('<ff-card')
  expect(html).not.toContain('ff-kanban-muster')
})
