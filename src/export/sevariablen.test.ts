import { expect, test } from 'vitest'
import type { Datenquelle } from '../kern/daten/datenquellen'
import { baueSevariablen } from './sevariablen'

interface Bestellung {
  VAR?: { ID: string; FELDER: string }[]
  SEFILELOOP: { ALIAS: string; ID: string; KOPFSATZ_INDEX?: string; FELDER: string }[]
  ERPAPICALL: { ALIAS: string; ID: string; FELDER: string }[]
  MASKE?: {
    ID: string; BEREICH: string; FELDER: string; REFRESH_FELDER: string; ALIAS: string
  }[]
}

function bestellung(
  used: readonly Datenquelle[],
  benutzt: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): Bestellung {
  return JSON.parse(baueSevariablen(used, benutzt, new Map())) as Bestellung
}

function felder(codes: readonly string[]): Datenquelle['felder'] {
  return codes.map((code) => ({ code, name: code }))
}

const artikel: Datenquelle = {
  id: 'q-art', name: 'ART', art: 'artikelstamm', felder: felder(['18_25', '45_60']),
}

const positionen: Datenquelle = {
  id: 'q-pos',
  name: 'POS',
  art: 'belegposition',
  kopfsatzIndex: 'BEL_0_11',
  felder: felder(['18_25', '164_8']),
}

const belegkopf: Datenquelle = {
  id: 'q-bel',
  name: 'BEL',
  art: 'beleg',
  lieferung: 'offenerSatz',
  felder: felder(['2_1', '3_8']),
}

// Der Grund: steht ein Kopfsatz-Loop VORNE, liefert SoftEngine aus KEINER
// Quelle Daten.
test('Kopfsatz-Loops stehen zwangsweise zuletzt', () => {
  const zuerstPos = bestellung([positionen, artikel])
  expect(zuerstPos.SEFILELOOP.map((e) => e.ALIAS)).toEqual(['ART', 'POS'])

  // Auch die andere Eingabereihenfolge muss dieselbe Datei ergeben.
  const zuerstArt = bestellung([artikel, positionen])
  expect(zuerstArt.SEFILELOOP.map((e) => e.ALIAS)).toEqual(['ART', 'POS'])
})

test('der Kopfsatz-Loop traegt seinen KOPFSATZ_INDEX', () => {
  const pos = bestellung([positionen]).SEFILELOOP.find((e) => e.ALIAS === 'POS')
  expect(pos?.KOPFSATZ_INDEX).toBe('BEL_0_11')
  expect(pos?.ID).toBe('POS')
})

test('offener Satz wird nicht als Loop bestellt, sondern im VAR-Abschnitt', () => {
  const raus = bestellung([belegkopf])
  expect(raus.SEFILELOOP).toEqual([])
  expect(raus.VAR).toEqual([{ ID: 'BEL', FELDER: '2_1,3_8' }])
})

// varZusammen: Kopfsatz-Index und offener Satz zeigen auf DIESELBE Tabelle
// (POS haengt an BEL_0_11, der Belegkopf IST BEL). Zwei VAR-Eintraege mit
// derselben ID waeren eine doppelte Bestellung.
test('Kopfsatz und offener Satz derselben Tabelle werden EIN VAR-Eintrag', () => {
  const raus = bestellung([positionen, belegkopf])
  expect(raus.VAR).toEqual([{ ID: 'BEL', FELDER: '0_11,2_1,3_8' }])
})

test('dasselbe Feld zweimal bestellt wird einmal geschrieben', () => {
  const belegMitSatzschluessel: Datenquelle = {
    ...belegkopf,
    felder: felder(['0_11', '2_1']),
  }
  const raus = bestellung([positionen, belegMitSatzschluessel])
  expect(raus.VAR).toEqual([{ ID: 'BEL', FELDER: '0_11,2_1' }])
})

test('ohne VAR-Bedarf fehlt der VAR-Abschnitt ganz', () => {
  expect(bestellung([artikel]).VAR).toBeUndefined()
})

// SoftEngine schlaegt zu jedem gelieferten Wert nach; eine Quelle mit 34
// Feldern, von denen die Maske drei zeigt, kostet das Elffache an Zeit.
const langePos: Datenquelle = {
  id: 'q-pos-lang',
  name: 'POS',
  art: 'belegposition',
  felder: felder(['2_1', '3_8', '11_6', '18_25', '45_60', '164_8']),
}

test('bestellt werden nur die Felder, die die Maske liest', () => {
  const raus = bestellung([langePos], new Map([['q-pos-lang', new Set(['18_25', '164_8'])]]))
  expect(raus.SEFILELOOP[0]?.FELDER).toBe('18_25,164_8')
})

test('das gilt auch fuer die ERP-Abfrage', () => {
  const abfrage: Datenquelle = {
    id: 'q-api',
    name: 'Artikelstamm',
    art: 'erpabfrage',
    idbId: 'ARTIKEL.GET',
    feldVorsatz: 'ART',
    felder: felder(['ART_1_25', 'ART_51_60', 'ART_759_10', 'ART_2035_80']),
  }
  const raus = bestellung([abfrage], new Map([['q-api', new Set(['ART_51_60'])]]))
  expect(raus.ERPAPICALL).toEqual([
    { ID: 'ARTIKEL.GET', ALIAS: 'Artikelstamm', FELDER: 'ART_51_60' },
  ])
})

// Der Rueckfall: '*' ist bei diesen Arten nicht erlaubt, und eine leere
// Bestellung waere ein stiller Ausfall.
test('liest die Maske aus der Quelle nichts, bleibt es bei der ganzen Liste', () => {
  expect(bestellung([langePos]).SEFILELOOP[0]?.FELDER)
    .toBe('2_1,3_8,11_6,18_25,45_60,164_8')
})

test('ein gebundener Code ausserhalb der Feldliste kommt trotzdem mit', () => {
  const raus = bestellung([langePos], new Map([['q-pos-lang', new Set(['3_8', '940_60'])]]))
  expect(raus.SEFILELOOP[0]?.FELDER).toBe('3_8,940_60')
})

// {PINDEX} loest sich aus dem indexField auf. Gebunden ist die Satznummer
// fast nie — fehlt sie in der Bestellung, liefert SoftEngine sie nicht, und
// Aendern wie Loeschen schreibt ins Nichts. Still, denn ein PUT ist ein
// Einweg-Ruf: seine Ablehnung sieht die Maske nicht.
test('die Satznummer kommt mit, auch wenn keine Spalte an ihr haengt', () => {
  const mitSatznummer: Datenquelle = { ...langePos, satzFeld: '645_10' }
  const raus = bestellung([mitSatznummer], new Map([['q-pos-lang', new Set(['18_25'])]]))
  expect(raus.SEFILELOOP[0]?.FELDER).toBe('645_10,18_25')
})

test('der offene Satz behaelt seine benutzten Felder im VAR-Abschnitt', () => {
  const raus = bestellung([positionen, belegkopf], new Map([['q-bel', new Set(['3_8'])]]))
  expect(raus.VAR).toEqual([{ ID: 'BEL', FELDER: '0_11,3_8' }])
})

// Eine ERP-Abfrage ist eine reine Lesequelle. Sie hat keine Satznummer — der
// Feldcode aus dem Formular gehoert nicht in ihre Bestellung: ihre Felder
// heissen mit Vorsatz, ein nacktes 0_10 kennt sie gar nicht.
test('eine Lesequelle bestellt keine Satznummer', () => {
  const lesequelle: Datenquelle = {
    id: 'q-lese',
    name: 'Artikelstamm',
    art: 'erpabfrage',
    idbId: 'ARTIKEL.GET',
    feldVorsatz: 'ART',
    satzFeld: '0_10',
    felder: felder(['ART_1_25', 'ART_51_60']),
  }
  const raus = bestellung([lesequelle], new Map([['q-lese', new Set(['ART_51_60'])]]))
  expect(raus.ERPAPICALL[0]?.FELDER).toBe('ART_51_60')
})

// Eine Quelle, die ihren Wert selbst per Relation holt, wartet auf keine
// Lieferung — sie darf deshalb in keinem Abschnitt der Bestellung stehen.
// Stuende sie im SEFILELOOP, bestellte die Maske eine Tabelle, die es nicht
// gibt (ID:""), und SoftEngine braeche laut Kontrakt die ganze Loop-Liste ab.
// Echttest 2026-09-18 (kontrakte.md 7a): so bestellt, kam die Maske samt
// Feldbeschreibung an. FELDER und REFRESH_FELDER stehen fest auf '*' — die
// Beschreibung ist der Zweck der Bestellung, und ohne die Klartexte staende in
// jeder Zelle ein Code. Der Bereich wird gross geschrieben, sonst findet
// SoftEngine die Maske nicht.
test('eine ERP-Maske wird ganz bestellt, mit Bereich in Grossbuchstaben', () => {
  const anschrift: Datenquelle = {
    id: 'q-maske',
    name: 'Anschrift',
    art: 'erpmaske',
    idbId: '1211S5OPT01',
    bereich: 'bel',
    felder: [],
  }
  const raus = bestellung([anschrift, artikel])
  expect(raus.MASKE).toEqual([
    {
      ID: '1211S5OPT01',
      BEREICH: 'BEL',
      FELDER: '*',
      REFRESH_FELDER: '*',
      ALIAS: 'Anschrift',
    },
  ])
  // Sie ist keine Zeilenquelle: im Loop haette sie eine Tabelle bestellt, die
  // es nicht gibt.
  expect(raus.SEFILELOOP.map((e) => e.ALIAS)).toEqual(['ART'])
})

test('ohne ERP-Maske steht kein MASKE-Block in der Bestellung', () => {
  expect(bestellung([artikel]).MASKE).toBeUndefined()
})

test('„Wert per Relation" wird nicht bestellt', () => {
  const adressnummer: Datenquelle = {
    id: 'q-adrnr',
    name: 'Adressnummer',
    art: 'relationswert',
    holWert: { relationId: 'r-408', parameter: [] },
    felder: [{ code: 'NUMMER', name: 'Nummer' }],
  }
  const raus = bestellung([adressnummer, artikel])
  expect(raus.SEFILELOOP.map((e) => e.ALIAS)).toEqual(['ART'])
  expect(raus.ERPAPICALL).toEqual([])
  expect(raus.VAR).toBeUndefined()
})
