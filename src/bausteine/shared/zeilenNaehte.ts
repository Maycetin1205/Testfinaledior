// Die zwei Naehte, an denen eine schreibende Tabelle in die gezeichnete Liste greift.
import { nothing, type TemplateResult } from 'lit'
import type { Spalte, Spaltensicht } from '../tabelle/spalten'

// Was an einer gelieferten Zeile zusaetzlich haengt. Die Liste haengt nichts an.
export interface Zeilenschmuck {
  // Leer heisst: nichts zu melden, die Zeile bekommt kein data-status.
  status: string

  titel: string

  klasse: string

  // Steht als Wort in der ersten Zelle, nicht nur im Tooltip.
  fehltext: string

  // Eine eigene Zelle statt des Textes; null heisst: die Liste zeichnet sie.
  zelle: (platz: number, spalte: Spalte, wert: string) => TemplateResult | null

  rechts: TemplateResult | typeof nothing

  // true heisst: die Taste ist verbraucht.
  taste: (e: KeyboardEvent) => boolean
}

export const OHNE_SCHMUCK: Zeilenschmuck = {
  status: '',
  titel: '',
  klasse: '',
  fehltext: '',
  zelle: () => null,
  rechts: nothing,
  taste: () => false,
}

// Was unter den Datenzeilen steht, an der naechsten FREIEN Zeile. anzahl sagt
// der Seitenrechnung, wie viele Zeilen davon belegt sind.
export interface Unterzeilen {
  anzahl: number

  zeichne: (lage: {
    sicht: Spaltensicht
    cols: Readonly<Record<string, string>>
    linealTakte: number | null
  }) => TemplateResult
}
