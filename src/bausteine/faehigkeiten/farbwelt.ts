// Faehigkeit Farbwelt: die Bedeutung eines Bausteins als Farbpaar -- die Wahl
// im Inspector und der Stil, der `.v-<wert>` in zwei CSS-Variablen uebersetzt.
import { css, unsafeCSS } from 'lit'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { FARBWELTEN, farbweltOptionen } from '../../kern/maske/farbwelten'

export { farbweltWert } from '../../kern/maske/farbwelten'
export type { Farbwelt, FarbweltWert } from '../../kern/maske/farbwelten'

export function farbweltEigenschaft(schluessel: string, beschreibung: string): Eigenschaft {
  return {
    schluessel,
    name: 'Bedeutung',
    beschreibung,
    art: 'select',
    optionen: farbweltOptionen(),
  }
}

export const farbweltStil = css`${unsafeCSS(FARBWELTEN
  .map((f) => `.v-${f.wert} { --fw-stark: var(${f.stark}); --fw-sanft: var(${f.sanft}); }`)
  .join('\n  '))}`
