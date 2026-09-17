// Der Vertrag der Rasterflaeche: in einem Kasten faellt kein Baustein unter die
// letzte Zeile, die noch hineinpasst. Dort waere er weder zu sehen noch zu fassen.
import { expect, test } from 'vitest'
import { hoeheImKasten, zeileImKasten } from './rasterFlaeche'

// Ein Bereich mit 12 Rasterzeilen fasst innen 11: Rand und Innenabstand nehmen
// eine. Im Browser gemessen, hier als Zahl eingesetzt.
const KASTEN = 11

test('die Wurzelflaeche begrenzt nichts: sie waechst mit ihrem Inhalt', () => {
  expect(zeileImKasten(null, 40, 3)).toBe(40)
  expect(zeileImKasten(null, -2, 1)).toBe(0)
  expect(hoeheImKasten(null, 40, 30)).toBe(30)
})

test('im Kasten haelt die letzte passende Zeile den Baustein auf', () => {
  expect(zeileImKasten(KASTEN, 20, 1)).toBe(10)
  expect(zeileImKasten(KASTEN, 10, 1)).toBe(10)
  expect(zeileImKasten(KASTEN, 4, 1)).toBe(4)
})

test('ein hoher Baustein steht so weit oben, dass er ganz im Kasten ist', () => {
  expect(zeileImKasten(KASTEN, 9, 3)).toBe(8)
  // Hoeher als der Kasten: er bleibt oben, statt nach unten zu verschwinden.
  expect(zeileImKasten(KASTEN, 4, 20)).toBe(0)
})

test('am unteren Anfasser bleibt die Oberkante stehen und die Hoehe endet am Kasten', () => {
  expect(hoeheImKasten(KASTEN, 5, 20)).toBe(6)
  expect(hoeheImKasten(KASTEN, 0, 20)).toBe(KASTEN)
  expect(hoeheImKasten(KASTEN, 5, 3)).toBe(3)
})
