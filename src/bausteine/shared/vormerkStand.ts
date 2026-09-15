// Wie viel noch zu schreiben ist: gezaehlt an einer Stelle, gezeigt am Baustein und am Knopf.
import { abschnitteVon, kettenLesen } from '../../kern/daten/aktionen'
import type {
  AenderungsTraegerElement,
  ErfassungsTraegerElement,
  LoeschTraegerElement,
  VormerkArt,
} from '../../kern/maske/faehigkeiten'
import { sucheTraeger } from '../faehigkeiten/ereignisse'

export const VORMERK_EVENT = 'ff-vormerkungen'

export interface VormerkZahlen {
  erfasst: number
  geaendert: number
  geloescht: number
}

type VormerkTraeger = HTMLElement
  & Partial<ErfassungsTraegerElement>
  & Partial<AenderungsTraegerElement>
  & Partial<LoeschTraegerElement>

// Gezaehlt werden ZEILEN, nicht Zellen: die Summe ist zugleich die Zahl der
// Laeufe, die der Knopf vor sich hat.
export function vormerkSumme(zahlen: VormerkZahlen): number {
  return zahlen.erfasst + zahlen.geaendert + zahlen.geloescht
}

function anzahlVon(traeger: VormerkTraeger, art: VormerkArt): number {
  if (art === 'erfasst') return traeger.erfassteZeilen?.length ?? 0
  if (art === 'geaendert') return traeger.geaenderteZeilen?.length ?? 0
  return traeger.geloeschteZeilen?.length ?? 0
}

// Welche Listen eine Kette liest, steht in ihren eigenen Parametern. undefined
// heisst: sie liest keine Vormerkungen, der Knopf bleibt ohne Zaehler.
export function vormerkStandVon(el: HTMLElement, eventKey: string): VormerkZahlen | undefined {
  const steps = kettenLesen(el.getAttribute('data-ff-aktionen'))[eventKey]
  if (!steps || steps.length === 0) return undefined
  const zahlen: VormerkZahlen = { erfasst: 0, geaendert: 0, geloescht: 0 }
  const gezaehlt = new Set<string>()
  for (const abschnitt of abschnitteVon(steps)) {
    if (abschnitt.art === 'einmal' || abschnitt.blockId === '') continue
  // Dieselbe Liste kann in mehreren Abschnitten stehen; gezaehlt wird sie einmal.
    const kennung = abschnitt.art + ' ' + abschnitt.blockId
    if (gezaehlt.has(kennung)) continue
    const traeger = sucheTraeger(el.ownerDocument ?? document, abschnitt.blockId)
    if (!traeger) continue
    gezaehlt.add(kennung)
    zahlen[abschnitt.art] += anzahlVon(traeger, abschnitt.art)
  }
  return gezaehlt.size === 0 ? undefined : zahlen
}

const zuletzt = new WeakMap<HTMLElement, string>()

// Nur bei echter Aenderung: gemeldet wird bei jedem Rendern, und das passiert
// bei jedem Tastendruck in einer aenderbaren Zelle.
export function meldeVormerkungen(el: VormerkTraeger): void {
  const jetzt = [
    anzahlVon(el, 'erfasst'),
    anzahlVon(el, 'geaendert'),
    anzahlVon(el, 'geloescht'),
  ].join(' ')
  if (zuletzt.get(el) === jetzt) return
  zuletzt.set(el, jetzt)
  el.dispatchEvent(new CustomEvent(VORMERK_EVENT, { bubbles: true, composed: true }))
}
