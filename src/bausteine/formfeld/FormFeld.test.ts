// Der Vertrag des Formularfelds mit Export und Maske: was der Editor einstellt,
// steht als Attribut im Export, und die Maske liest genau diese Namen.
import { expect, test } from 'vitest'
import '../anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { bausteinArt } from '../../kern/maske/registry'
import { exportMask } from '../../export/exportMask'
import { laufzeitTeileFuer } from '../../export/laufzeitTeile'
import { FormFeld } from './FormFeld'

const QUELLE = {
  id: 'q1', name: 'Positionen', art: 'belegposition', satzFeld: '645_10',
  felder: [{ code: '18_25', name: 'ArtNr' }, { code: '45_60', name: 'Bezeichnung' }],
} as const

const ARTIKEL = {
  id: 'q2', name: 'Artikel', art: 'artikelstamm',
  felder: [{ code: 'nr', name: 'Nummer' }, { code: 'bez', name: 'Bezeichnung' }],
} as const

function maskeMitFeld(werte: Record<string, unknown>): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: ['f1'] },
    f1: {
      id: 'f1',
      typ: FormFeld.typ,
      werte: { rasterX: 0, rasterY: 0, rasterW: 12, rasterH: 2, ...werte },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as Maskenbaum
}

function feldTag(werte: Record<string, unknown>): string {
  const { html } = exportMask(maskeMitFeld(werte), 'Test', [QUELLE, ARTIKEL], [])
  return /<ff-formfeld[^>]*>/.exec(html)?.[0] ?? ''
}

test('das Formularfeld meldet sich mit deutschen Eigenschaften und seinen Faehigkeiten an', () => {
  const art = bausteinArt(FormFeld.typ)
  expect(art?.tag).toBe('ff-formfeld')
  expect(Object.keys(FormFeld.vorgaben)).toEqual([
    'feldTyp', 'beschriftung', 'optionen', 'quelle', 'wert', 'wertField',
    'nachschlagQuelle', 'speicherFeld', 'speicherTitel', 'nachschlagSpalten',
    'fensterBreite', 'fensterHoehe', 'einzigerTreffer', 'darstellung',
  ])
  expect((art?.faehigkeiten ?? []).map((f) => f.art)).toEqual([
    'quelle', 'auswahlFolgen', 'satzwahl', 'liste', 'suchfenster',
    'bindbar', 'aktionswert', 'ereignisse',
  ])
  expect(faehigkeit(art, 'bindbar')?.stellen.map((s) => s.prop)).toEqual(['wert'])
  expect(faehigkeit(art, 'suchfenster')?.fenster.spaltenSchluessel).toBe('nachschlagSpalten')
})

test('Feldtyp, Beschriftung, Optionen und Feldbindung erreichen den Export unter ihren Namen', () => {
  const tag = feldTag({
    feldTyp: 'select', beschriftung: 'Zimmer', optionen: 'A, B', quelle: 'q1', darstellung: 'linie',
  })
  expect(tag).toContain(' feldtyp="select"')
  expect(tag).toContain(' beschriftung="Zimmer"')
  expect(tag).toContain(' optionen="A, B"')
  expect(tag).toContain(' darstellung="linie"')
  expect(tag).not.toContain('fieldtype=')
  expect(tag).not.toContain('placeholder=')
  expect(tag).not.toContain(' options=')
  expect(tag).not.toContain(' width=')

  // Die gebundene Stelle heisst `wert`; ihre Bindung traegt weiter den Zusatz
  // des Kerns, den jede bindbare Stelle traegt.
  const gebunden = feldTag({ feldTyp: 'text', quelle: 'q1', wertField: '45_60' })
  expect(gebunden).toContain(' wertfield="45_60"')
  expect(gebunden).not.toContain('valuefield=')
  // Gebunden zeigt das Feld den Klarnamen statt des eingetippten Namens.
  expect(gebunden).toContain(' beschriftung="Bezeichnung"')
})

test('Nachschlagen bringt Quelle, gespeichertes Feld und Fenstermass mit', () => {
  const tag = feldTag({
    feldTyp: 'nachschlagen',
    nachschlagQuelle: 'q2',
    speicherFeld: 'nr',
    speicherTitel: 'Nummer',
    nachschlagSpalten: [{ kennung: 's1', titel: 'Nummer', feld: 'nr' }],
    fensterBreite: 700,
    einzigerTreffer: 'ja',
  })
  expect(tag).toContain(' feldtyp="nachschlagen"')
  expect(tag).toContain(' nachschlagquelle="q2"')
  expect(tag).toContain(' speicherfeld="nr"')
  expect(tag).toContain(' fensterbreite="700"')
  expect(tag).toContain(' einzigertreffer="ja"')
  expect(tag).toContain('&quot;feld&quot;:&quot;nr&quot;')
})

// Das Suchfenster IST eine Tabelle. Die Faehigkeit Nachschlagen holt sie selbst;
// der Baustein importiert keinen anderen Baustein mehr.
test('eine Maske mit einem Formularfeld traegt den Baustein der Fenstertabelle', () => {
  const teile = laufzeitTeileFuer(new Set(['formfeld'])).map((t) => t.name)
  expect(teile).toContain('faehigkeit-nachschlagen')
  expect(teile).toContain('tabelle')
})
