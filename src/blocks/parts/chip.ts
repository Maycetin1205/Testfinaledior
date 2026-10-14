import { css } from 'lit'
import { lookClass } from '../look/look'

// The shape of a chip, as .alert of the sample: room around its words, the
// small radius, on the ground of its emphasis, the line drawn inside; its
// words stand 10 px in, where the words of a field and a text stand.
// The block carries lookStyle, which gives each tone and emphasis its colors.
// A text on a ground takes it; Nur Schrift is no chip.
export const chipShape = css`
  box-sizing: border-box;
  padding: 3px 10px;
  border-radius: var(--se-radius-sm);
  background: var(--look-ground);
  color: var(--look-ink);
  outline: var(--se-border) solid var(--look-edge);
  outline-offset: calc(-1 * var(--se-border));
`

// The board's chip, its flag: a short word in the second ink beside a dot
// of the color it was given, no pill (Tonprobe 3, 14.10.). The card wears
// the same color as a stripe.
export const chipStyle = css`
  .chip {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--se-ink-2);
    white-space: nowrap;
  }
  .chip:not(:empty)::before {
    content: "";
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--tone-strong);
  }
`

export function chipClass(tone: string, emphasis: string): string {
  return `chip ${lookClass({ tone, emphasis })}`
}
