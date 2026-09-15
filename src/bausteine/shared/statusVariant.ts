// Die eine Farbliste der Maske: Wert, Klarname, Farbpaar. Wer eine Farbe
// anbietet, nimmt sie hier her — der Inspector die Kachel, der Baustein die
// Klasse v-<wert> und darin --fw-stark und --fw-sanft.
import { css, unsafeCSS } from 'lit'
import type {
  Eigenschaft,
  Wahloption,
} from '../../kern/maske/eigenschaft'

export type StatusVariant = 'info' | 'success' | 'warning' | 'danger'

interface Farbwelt {
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
  return FARBWELTEN.map((f) => ({ value: f.wert, label: f.name, farbe: `var(${f.stark})` }))
}

export function statusVariantProperty(
  attributeName: string,
  description: string,
  name = 'Bedeutung',
): Eigenschaft {
  return {
    attributeName,
    name,
    description,
    kind: 'select',
    options: farbweltOptionen(),
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
