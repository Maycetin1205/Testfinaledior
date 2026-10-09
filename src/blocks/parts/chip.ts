import { css } from 'lit'
import { lookClass } from '../look/look'

// The shape of a chip, as .alert of the sample: room around its words, the
// small radius, on the ground of its emphasis, the line drawn inside; its
// words stand 10 px in, where the words of a field and a text stand.
// The block carries lookStyle, which gives each tone and emphasis its colors.
// The board's chip and a text on a ground take it; Nur Schrift is no chip.
export const chipShape = css`
  box-sizing: border-box;
  padding: 3px 10px;
  border-radius: var(--se-radius-sm);
  background: var(--look-ground);
  color: var(--look-ink);
  outline: var(--se-border) solid var(--look-edge);
  outline-offset: calc(-1 * var(--se-border));
`

// The board's chip: a short word in the color and emphasis it was given.
export const chipStyle = css`
  .chip {
    flex: none;
    font-family: var(--se-font);
    font-size: var(--se-fs-chip);
    font-weight: 700;
    color: var(--look-ink);
    white-space: nowrap;
  }
  .chip:not(.emphasis-text) { ${chipShape} }
`

export function chipClass(tone: string, emphasis: string): string {
  return `chip ${lookClass({ tone, emphasis })}`
}
