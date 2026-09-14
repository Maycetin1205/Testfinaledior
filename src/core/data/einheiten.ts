// Die Einheiten einer Berechnung: was sich ineinander umrechnen laesst und was nicht.

// Masse rechnet nur in Masse, Volumen nur in Volumen. Zaehlendes (Tiere, Tage)
// traegt keine Groesse und faellt aus der Einheitenprobe heraus; sonst ginge
// eine Gleichung wie „Menge mal Stammgewicht = Tiere mal Tage mal Gewicht mal
// Dosis" nie auf, obwohl sie in der Sache stimmt.
export type Einheitenart = 'masse' | 'volumen' | 'zaehlend'

export interface Einheit {
  code: string
  name: string

  // Was im Feld steht; bei blosser Anzahl nichts.
  kurz: string
  art: Einheitenart

  // In der Basiseinheit der Art (Masse: g, Volumen: ml); Zaehlendes immer 1.
  faktor: number
}

export const EINHEITEN: readonly Einheit[] = [
  { code: 'kg', name: 'Kilogramm', kurz: 'kg', art: 'masse', faktor: 1000 },
  { code: 'g', name: 'Gramm', kurz: 'g', art: 'masse', faktor: 1 },
  { code: 'mg', name: 'Milligramm', kurz: 'mg', art: 'masse', faktor: 0.001 },
  { code: 'l', name: 'Liter', kurz: 'l', art: 'volumen', faktor: 1000 },
  { code: 'ml', name: 'Milliliter', kurz: 'ml', art: 'volumen', faktor: 1 },
  { code: 'anzahl', name: 'Anzahl', kurz: '', art: 'zaehlend', faktor: 1 },
  { code: 'tag', name: 'Tage', kurz: 'Tage', art: 'zaehlend', faktor: 1 },
]

// Eine Zahl ohne Groesse: der harmlose Standard fuer eine neue Angabe.
export const EINHEIT_STANDARD = 'anzahl'

export function einheitVon(code: string): Einheit | undefined {
  return EINHEITEN.find((e) => e.code === code)
}

export function einheitName(code: string): string {
  return einheitVon(code)?.name ?? code
}

export function einheitKurz(code: string): string {
  const einheit = einheitVon(code)
  if (einheit === undefined) return code
  return einheit.kurz === '' ? einheit.name : einheit.kurz
}

// null heisst: die Einheit ist unbekannt. Geraten wird nicht — daraus wuerde
// stillschweigend der Faktor 1 und damit eine falsche Zahl.
export function inBasis(wert: number, code: string): number | null {
  const einheit = einheitVon(code)
  return einheit === undefined ? null : wert * einheit.faktor
}

export function ausBasis(wert: number, code: string): number | null {
  const einheit = einheitVon(code)
  return einheit === undefined ? null : wert / einheit.faktor
}

// Die Groesse eines Produkts: je Art, wie oft sie darin vorkommt. Zaehlendes
// steht nicht darin.
export type Groessenbild = Readonly<Record<'masse' | 'volumen', number>>

export const GROESSENBILD_LEER: Groessenbild = { masse: 0, volumen: 0 }

export function bildMit(bild: Groessenbild, code: string, mal: 1 | -1): Groessenbild | null {
  const einheit = einheitVon(code)
  if (einheit === undefined) return null
  if (einheit.art === 'zaehlend') return bild
  return { ...bild, [einheit.art]: bild[einheit.art] + mal }
}

export function bilderGleich(a: Groessenbild, b: Groessenbild): boolean {
  return a.masse === b.masse && a.volumen === b.volumen
}

const ART_NAME: Record<'masse' | 'volumen', string> = { masse: 'Masse', volumen: 'Volumen' }

// „Masse²", „Masse mal Volumen", „ohne Groesse" — was auf einer Seite der
// Gleichung steht, in Worten.
export function bildAlsText(bild: Groessenbild): string {
  const teile: string[] = []
  for (const art of ['masse', 'volumen'] as const) {
    const n = bild[art]
    if (n === 0) continue
    teile.push(n === 1 ? ART_NAME[art] : `${ART_NAME[art]}^${n}`)
  }
  return teile.length === 0 ? 'ohne Größe' : teile.join(' × ')
}
