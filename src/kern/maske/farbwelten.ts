// Die eine Farbliste der Maske: Wert, Klarname, Farbpaar als Token-Namen.
import type { Wahloption } from './eigenschaft'

export type StatusVariant = 'info' | 'success' | 'warning' | 'danger'

export interface Farbwelt {
  wert: StatusVariant
  name: string
  // Die Namen der Token, nicht die Werte: die Farben stehen in design/maske.css.
  stark: string
  sanft: string
}

export const FARBWELTEN: readonly Farbwelt[] = [
  { wert: 'info', name: 'Hinweis', stark: '--se-blue', sanft: '--se-blue-soft' },
  { wert: 'success', name: 'Erfolg', stark: '--se-green', sanft: '--se-green-soft' },
  { wert: 'warning', name: 'Warnung', stark: '--se-amber', sanft: '--se-amber-soft' },
  { wert: 'danger', name: 'Fehler', stark: '--se-red', sanft: '--se-red-soft' },
]

export function coerceStatusVariant(value: string): StatusVariant {
  return FARBWELTEN.some((f) => f.wert === value) ? (value as StatusVariant) : 'info'
}

export function farbweltOptionen(): Wahloption[] {
  return FARBWELTEN.map((f) => ({ wert: f.wert, name: f.name, farbe: `var(${f.stark})` }))
}
