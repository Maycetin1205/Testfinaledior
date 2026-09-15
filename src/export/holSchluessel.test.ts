import { expect, test } from 'vitest'
import '../bausteine/anmeldung'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../kern/maske/baum'
import type { Datenquelle } from '../kern/daten/datenquellen'
import { holSchluesselJeGeber } from './benutzteQuellen'

// Woher eine holende Quelle ihren Beleg nimmt, steht am BAUSTEIN. Der Export
// muss die Schluesselfelder trotzdem bei der Geber-Quelle bestellen, sonst ginge
// der Parameter der Relation leer hinaus.

const belege: Datenquelle = {
  id: 'q-bel',
  name: 'Belege',
  kind: 'beleg',
  fields: [{ code: '3_8', label: 'Belegnummer' }],
}

const positionen: Datenquelle = {
  id: 'q-pos',
  name: 'Positionen',
  kind: 'belegposition',
  ladeRelation: {
    nr: '69',
    belegartFeld: '2_1',
    belegnummerFeld: '3_8',
    jahrFeld: '0_1',
    archivFeld: '',
    endeFelder: ['11_6'],
  },
  fields: [{ code: '18_25', label: 'Artikelnummer' }],
}

function baum(folge: unknown): Maskenbaum {
  return {
    [WURZEL_ID]: {
      id: WURZEL_ID, type: WURZEL_TYP, props: {}, parentId: '', childIds: ['bel', 'pos'],
    },
    bel: {
      id: 'bel', type: 'tabelle', props: { source: 'q-bel' }, parentId: WURZEL_ID, childIds: [],
    },
    pos: {
      id: 'pos',
      type: 'tabelle',
      props: { source: 'q-pos', folgtAuswahl: folge },
      parentId: WURZEL_ID,
      childIds: [],
    },
  } as unknown as Maskenbaum
}

test('die Schluesselfelder werden bei der Quelle des Geber-Bausteins bestellt', () => {
  const proGeber = holSchluesselJeGeber(
    baum([{ geberId: 'bel', keyPairs: [] }]),
    [belege, positionen],
  )
  // Ohne Archivfeld: ein leerer Code wird nicht bestellt.
  expect(proGeber.get('q-bel')).toEqual(['2_1', '3_8', '0_1'])
})

test('ohne Auswahl-Geber bestellt niemand etwas', () => {
  expect(holSchluesselJeGeber(baum([]), [belege, positionen]).size).toBe(0)
})

test('Feldpaare sind fuer die Bestellung gleichgueltig', () => {
  const mitPaaren = holSchluesselJeGeber(
    baum([{ geberId: 'bel', keyPairs: [{ fromField: '3_8', toField: '3_8' }] }]),
    [belege, positionen],
  )
  expect(mitPaaren.get('q-bel')).toEqual(['2_1', '3_8', '0_1'])
})
