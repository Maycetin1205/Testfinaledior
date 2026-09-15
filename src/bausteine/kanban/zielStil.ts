// Die Hervorhebung der Flaeche, auf der ein gezogenes Kaertchen landen wuerde.
import { css } from 'lit'

export const ZIEL_KLASSE = 'ziel'

export const zielStil = css`
  :host([data-ff-ziel]) .ziel {
    background: var(--se-accent-soft);
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }
`
