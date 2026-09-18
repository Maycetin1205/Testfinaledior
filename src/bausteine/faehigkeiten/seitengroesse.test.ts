// Der Vertrag der Rumpfmessung: sie kommt zur Ruhe. Der Kopf ist so hoch wie
// eine Zeile, die Zeilenhoehe wird unter dem gemessenen Kopf gerechnet — misst
// sich das gegenseitig hoch, haelt der Editor an (belegt am 16.09. im Browser:
// der Kopf sprang je Zeichenlauf zwischen 29 und 30 Pixeln).
import { expect, test } from 'vitest'
import { ZEILEN_HOEHE, zeilenmass } from './seitengroesse'
import { tabelleAnsicht } from './tabelleAnsicht'

// So misst der Browser: der Kopf uebernimmt die Zeilenhoehe, und offsetHeight
// gibt ganze Pixel zurueck.
function gemessenerKopf(zeilenHoehe: number): number {
  return Math.round(zeilenHoehe)
}

function folge(rumpf: number, runden: number): number[] {
  const gesehen: number[] = []
  let kopf = ZEILEN_HOEHE
  for (let i = 0; i < runden; i++) {
    const mass = zeilenmass(rumpf, kopf, ZEILEN_HOEHE)
    gesehen.push(mass.zeilenHoehe)
    kopf = gemessenerKopf(mass.zeilenHoehe)
  }
  return gesehen
}

test('die Zeilenhoehe steht still, obwohl der Kopf ihr folgt', () => {
  for (let rumpf = 60; rumpf <= 400; rumpf++) {
    const gesehen = folge(rumpf, 6)
    const nachDerErsten = new Set(gesehen.slice(1))
    expect(nachDerErsten.size, `Rumpf ${rumpf}px pendelt zwischen ${[...nachDerErsten].join(' und ')}`).toBe(1)
  }
})

test('Kopf und Zeilen bleiben zusammen im Rumpf', () => {
  for (let rumpf = 60; rumpf <= 400; rumpf++) {
    const mass = zeilenmass(rumpf, ZEILEN_HOEHE, ZEILEN_HOEHE)
    expect(mass.zeilenHoehe).toBeGreaterThanOrEqual(ZEILEN_HOEHE)
    // Der Kopf ist eine Zeile, also passen Kopf und Zeilen zusammen hinein.
    expect((mass.passen + 1) * mass.zeilenHoehe).toBeLessThanOrEqual(rumpf)
  }
})

// Die Erfassung im Editor: Kopf, Leerzeilen, Erfassungszeile und Lineal. Eine
// Zeile zu viel rollt den Koerper, obwohl der Kasten passt.
test('neben der Erfassungszeile steht keine Zeile mehr, als in den Rumpf passt', () => {
  for (let rumpf = 60; rumpf <= 400; rumpf++) {
    const mass = zeilenmass(rumpf, ZEILEN_HOEHE, ZEILEN_HOEHE)
    const ansicht = tabelleAnsicht({
      spalten: [{ kennung: 's1', titel: 'Spalte 1', feld: '' }],
      hatQuelle: false,
      datenGeliefert: false,
      datenzeilen: [],
      suchtext: '',
      sortSpalte: -1,
      sortAuf: true,
      wunschSeite: 0,
      gemessen: mass,
      belegteZeilen: 1,
      wertVon: () => '',
      blaettert: false,
    })
    const zeilen = 1 + ansicht.zeilen.length + 1 + (ansicht.linealTakte ?? 0)
    expect(zeilen * mass.zeilenHoehe, `Rumpf ${rumpf}px`).toBeLessThanOrEqual(rumpf)
  }
})
