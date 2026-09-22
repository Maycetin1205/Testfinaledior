// Die eine Farbliste der Maske: Wert, Klarname, Farbpaar als Token-Namen.
import type { Wahloption } from './eigenschaft'

export type FarbweltWert = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export interface Farbwelt {
  wert: FarbweltWert
  name: string
  // Die Namen der Token, nicht die Werte: die Farben stehen in design/maske.css.
  stark: string
  sanft: string
  schrift: string
  schale: string
  rand: string
}

function toene(farbe: string): Omit<Farbwelt, 'wert' | 'name'> {
  return {
    stark: `--se-${farbe}`,
    sanft: `--se-${farbe}-soft`,
    schrift: `--se-${farbe}-text`,
    schale: `--se-${farbe}-shell`,
    rand: `--se-${farbe}-line`,
  }
}

export const FARBWELTEN: readonly Farbwelt[] = [
  { wert: 'info', name: 'Hinweis', ...toene('blue') },
  { wert: 'success', name: 'Erfolg', ...toene('green') },
  { wert: 'warning', name: 'Warnung', ...toene('amber') },
  { wert: 'danger', name: 'Fehler', ...toene('red') },
  // Ohne Bedeutung: fuer das, was nur da ist, etwa die Termine, die noch warten.
  { wert: 'neutral', name: 'Neutral', ...toene('slate') },
]

export function farbweltWert(wert: string): FarbweltWert {
  return FARBWELTEN.some((f) => f.wert === wert) ? (wert as FarbweltWert) : 'info'
}

export function farbweltOptionen(): Wahloption[] {
  return FARBWELTEN.map((f) => ({ wert: f.wert, name: f.name, farbe: `var(${f.stark})` }))
}
