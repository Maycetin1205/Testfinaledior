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
  art: 'beleg',
  felder: [{ code: '3_8', name: 'Belegnummer' }],
}

const positionen: Datenquelle = {
  id: 'q-pos',
  name: 'Positionen',
  art: 'belegposition',
  ladeRelation: {
    nr: '69',
    belegartFeld: '2_1',
    belegnummerFeld: '3_8',
    jahrFeld: '0_1',
    archivFeld: '',
    endeFelder: ['11_6'],
  },
  felder: [{ code: '18_25', name: 'Artikelnummer' }],
}

function baum(folge: unknown): Maskenbaum {
  return {
    [WURZEL_ID]: {
      id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: '', kinderIds: ['bel', 'pos'],
    },
    bel: {
      id: 'bel', typ: 'tabelle', werte: { quelle: 'q-bel' }, elternId: WURZEL_ID, kinderIds: [],
    },
    pos: {
      id: 'pos',
      typ: 'tabelle',
      werte: { quelle: 'q-pos', folgtAuswahl: folge },
      elternId: WURZEL_ID,
      kinderIds: [],
    },
  } as unknown as Maskenbaum
}

test('die Schluesselfelder werden bei der Quelle des Geber-Bausteins bestellt', () => {
  const proGeber = holSchluesselJeGeber(
    baum([{ geberId: 'bel', paare: [] }]),
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
    baum([{ geberId: 'bel', paare: [{ vonFeld: '3_8', nachFeld: '3_8' }] }]),
    [belege, positionen],
  )
  expect(mitPaaren.get('q-bel')).toEqual(['2_1', '3_8', '0_1'])
})
