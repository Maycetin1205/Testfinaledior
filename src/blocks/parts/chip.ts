import { css } from 'lit'
import { toneValue } from '../look/look'

// The chip: a short word on the soft color of its tone. The block that shows
// it carries lookStyle, which gives each tone its colors.
export const chipStyle = css`
  .chip {
    flex: none;
    padding: 2px 8px;
    border-radius: var(--se-radius);
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
