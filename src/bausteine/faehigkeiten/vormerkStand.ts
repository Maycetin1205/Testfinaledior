// Wie viele Zeilen noch zu schreiben sind: gezaehlt an einer Stelle, gemeldet
// von dem Baustein, der sie fuehrt.
import type {
  AenderungsTraegerElement,
  ErfassungsTraegerElement,
  LoeschTraegerElement,
  VormerkArt,
} from '../../kern/maske/faehigkeiten'

export const VORMERK_EVENT = 'ff-vormerkungen'

export type VormerkTraeger = HTMLElement
  & Partial<ErfassungsTraegerElement>
  & Partial<AenderungsTraegerElement>
  & Partial<LoeschTraegerElement>

const ARTEN: readonly VormerkArt[] = ['erfasst', 'geaendert', 'geloescht']

// Gezaehlt werden ZEILEN, nicht Zellen: eine vorgemerkte Zeile ist ein Lauf der
// Kette, die sie schreibt.
export function vorgemerkteZeilen(traeger: VormerkTraeger, art: VormerkArt): number {
  if (art === 'erfasst') return traeger.erfassteZeilen?.length ?? 0
  if (art === 'geaendert') return traeger.geaenderteZeilen?.length ?? 0
  return traeger.geloeschteZeilen?.length ?? 0
}

const zuletzt = new WeakMap<HTMLElement, string>()

// Nur bei echter Aenderung: gemeldet wird bei jedem Rendern, und das passiert
// bei jedem Tastendruck in einer aenderbaren Zelle.
export function meldeVormerkungen(el: VormerkTraeger): void {
  const jetzt = ARTEN.map((art) => vorgemerkteZeilen(el, art)).join(' ')
  if (zuletzt.get(el) === jetzt) return
  zuletzt.set(el, jetzt)
  el.dispatchEvent(new CustomEvent(VORMERK_EVENT, { bubbles: true, composed: true }))
}
