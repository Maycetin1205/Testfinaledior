// Wie viele Zeilen auf eine Seite passen, gemessen am Rumpf der Tabelle.

export const ZEILEN_HOEHE = 28

export const OHNE_MESSUNG = 10

const PLATZHALTER_OHNE_MESSUNG = 4

export function platzhalterZeilen(gemessen: number | null): number {
  return gemessen ?? PLATZHALTER_OHNE_MESSUNG
}

// Wie viele Zeilen der Kopf hoch ist, gemessen am Takt und nicht an Pixeln:
// der Kopf ist so hoch wie eine Zeile, zwei, wenn ein Titel umbricht. Ein
// Pixelwert taugt hier nicht, denn die gedehnte Zeilenhoehe macht den Kopf,
// den sie misst.
function kopfZeilen(kopfHoehe: number, takt: number): number {
  return Math.max(1, Math.floor(kopfHoehe / takt))
}

function passendeZeilen(
  rumpfHoehe: number,
  koepfe: number,
  zeilenHoehe: number,
): number {
  return Math.max(1, Math.floor(rumpfHoehe / zeilenHoehe) - koepfe)
}

export interface Zeilenmass {
  passen: number

  zeilenHoehe: number
}

// Kopf und Zeilen teilen sich den ganzen Rumpf, der Kopf zaehlt als Zeile mit.
// Die gemessene Kopfhoehe geht NICHT in die Rechnung ein: sie ist selbst das
// Ergebnis der letzten Dehnung, und damit misst sich die Tabelle endlos hoch
// (belegt am 16.09., der Kopf sprang je Zeichenlauf zwischen 29 und 30 Pixeln).
export function zeilenmass(
  rumpfHoehe: number,
  kopfHoehe: number,
  takt: number,
): Zeilenmass {
  const koepfe = kopfZeilen(kopfHoehe, takt)
  const passen = passendeZeilen(rumpfHoehe, koepfe, takt)
  const hoehe = rumpfHoehe / (passen + koepfe)
  if (hoehe < takt) return { passen, zeilenHoehe: takt }
  return { passen, zeilenHoehe: Math.floor(hoehe * 100) / 100 }
}

export function linealTakte(passen: number | null, gezeichnet: number): number | null {
  if (passen === null) return null
  return Math.max(0, passen - gezeichnet)
}

export interface Aufteilung {
  seiten: number

  seite: number

  zeilen: (number | null)[]
}

export interface AufteilungFrage {
  sichtbar: readonly number[]

  hatQuelle: boolean
  proSeite: number

  wunschSeite: number

  platzhalterZeilen: number
}

export function rollAufteilung({
  sichtbar,
  hatQuelle,
  platzhalterZeilen,
}: AufteilungFrage): Aufteilung {
  if (!hatQuelle) {
    return { seiten: 1, seite: 0, zeilen: Array.from({ length: platzhalterZeilen }, () => null) }
  }
  return { seiten: 1, seite: 0, zeilen: [...sichtbar] }
}

export function seitenAufteilung({
  sichtbar,
  hatQuelle,
  proSeite,
  wunschSeite,
  platzhalterZeilen,
}: AufteilungFrage): Aufteilung {
  const seiten = hatQuelle ? Math.max(1, Math.ceil(sichtbar.length / proSeite)) : 1

  const seite = Math.min(Math.max(wunschSeite, 0), seiten - 1)
  if (!hatQuelle) {
    return { seiten, seite, zeilen: Array.from({ length: platzhalterZeilen }, () => null) }
  }
  return { seiten, seite, zeilen: [...sichtbar.slice(seite * proSeite, (seite + 1) * proSeite)] }
}

export const OHNE_RUMPF = -1

export interface MessZiel {
  hasAttribute(name: string): boolean
  renderRoot: { querySelector(auswahl: string): Element | null }
}

export interface Rumpfmessung {
  mass: Zeilenmass | null

  hoehe: number

  // Der Kopf wird zweizeilig, sobald eine Spalte an eine Hilfsquelle gebunden
  // ist; der ResizeObserver sieht das nicht.
  kopf: number
}

export function rumpfHoehe(ziel: MessZiel): number {
  if (!ziel.hasAttribute('fuellt')) return OHNE_RUMPF
  const rumpf = ziel.renderRoot.querySelector('.koerper')
  return rumpf instanceof HTMLElement ? rumpf.clientHeight : OHNE_RUMPF
}

export function kopfHoehe(ziel: MessZiel): number {
  const kopf = ziel.renderRoot.querySelector('.kopf')
  return kopf instanceof HTMLElement ? kopf.offsetHeight : 0
}

export function gemessenesMass(ziel: MessZiel, takt: number): Rumpfmessung {
  const hoehe = rumpfHoehe(ziel)
  if (hoehe === OHNE_RUMPF) return { mass: null, hoehe, kopf: 0 }
  const kopf = kopfHoehe(ziel)
  return { mass: zeilenmass(hoehe, kopf, takt), hoehe, kopf }
}

export function beobachteRumpf(ziel: MessZiel, beiAenderung: () => void): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  const rumpf = ziel.renderRoot.querySelector('.koerper')
  if (!rumpf) return null
  const beobachter = new ResizeObserver(beiAenderung)
  beobachter.observe(rumpf)
  return beobachter
}
