import { BAUSTEIN_ID_ATTR } from '../../kern/daten/aktionen'
import { getField } from '../../softengine/data'
import { passendeVorschlaege, VORSCHLAEGE_MAX, type Vorschlag } from '../shared/vorschlagListe'
import { coerceSpalten, type Spalte } from './spalten'
import { gemerkteSortierung, sortiereIndizes } from './sortierung'

export function nachschlagKennung(el: HTMLElement, stelle = 'feld'): string {
  return `${el.getAttribute(BAUSTEIN_ID_ATTR) ?? ''}/nachschlagen/${stelle}`
}

// Automatische Spalten folgen ihrem Feld, auch wenn die Muttertabelle umsortiert wird.
export function nachschlagSpalten(spalten: readonly Spalte[]): Spalte[] {
  return coerceSpalten(spalten.map((s) => ({ ...s, kennung: s.kennung || `feld:${s.feld}` })))
}

export function vorschlaegeImFensterStand<T extends Vorschlag & { satz: unknown }>(
  eintraege: readonly T[], getippt: string, spalten: readonly Spalte[],
  el?: HTMLElement, stelle?: string,
): T[] {
  const treffer = getippt.trim() === '' ? [...eintraege]
    : passendeVorschlaege(eintraege, getippt, Infinity, true)
  const stand = el === undefined ? null : gemerkteSortierung.lies(el, nachschlagKennung(el, stelle))
  const spalte = stand === null ? undefined
    : nachschlagSpalten(spalten).find((s) => s.kennung === stand.kennung)
  // Erst alle passenden Treffer sortieren, dann kuerzen. Die Tabelle benutzt denselben Vergleich.
  if (spalte !== undefined && stand !== null) {
    const werte = treffer.map((e) => [getField(e.satz, spalte.feld)])
    return sortiereIndizes(werte, 0, stand.auf).slice(0, VORSCHLAEGE_MAX).map((i) => treffer[i])
  }
  return treffer.slice(0, VORSCHLAEGE_MAX)
}
