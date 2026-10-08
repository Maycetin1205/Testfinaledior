import { css } from 'lit'
import { toneValue } from '../look/look'

// The shape of a chip, as .vflag: a little room around its words and the
// radius of the mask. The board's chip and a text on a ground take it.
export const chipShape = css`
  padding: 2px 8px;
  border-radius: var(--se-radius);
`

// The chip: a short word on the soft color of its tone. The block that shows
// it carries lookStyle, which gives each tone its colors.
export const chipStyle = css`
  .chip {
    flex: none;
    ${chipShape}
    font-family: var(--se-font);
    font-size: var(--se-fs-chip);
    font-weight: 600;
    color: var(--tone-ink);
    background: var(--tone-soft);
    white-space: nowrap;
  }
`

export function chipClass(tone: string): string {
  return `chip tone-${toneValue(tone)}`
}
