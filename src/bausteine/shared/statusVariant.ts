// Die Farbliste der Maske als Stil und Inspector-Angabe; die Liste selbst steht
// im Kern, damit Baustein und Faehigkeit sie ohne Umweg ueber shared holen.
import { css, unsafeCSS } from 'lit'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { FARBWELTEN, farbweltOptionen } from '../../kern/maske/farbwelten'

export { coerceStatusVariant, farbweltOptionen, FARBWELTEN } from '../../kern/maske/farbwelten'
export type { Farbwelt, StatusVariant } from '../../kern/maske/farbwelten'

export function statusVariantProperty(
  schluessel: string,
  description: string,
  name = 'Bedeutung',
): Eigenschaft {
  return {
    schluessel,
    name,
    beschreibung: description,
    art: 'select',
    optionen: farbweltOptionen(),
  }
}

export const farbweltStil = css`${unsafeCSS(FARBWELTEN
  .map((f) => `.v-${f.wert} { --fw-stark: var(${f.stark}); --fw-sanft: var(${f.sanft}); }`)
  .join('\n  '))}`

export const chipStyles = css`
  ${farbweltStil}

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px 5px 9px;
    border-radius: var(--se-r-sm);

    clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.02em;
    color: var(--se-ink);
    background: var(--fw-sanft);
    white-space: nowrap;
  }

  .chip::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--fw-stark);
  }
`
