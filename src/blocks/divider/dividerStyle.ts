import { css } from 'lit'

// The hairline across the middle of the block's room, as between the parts
// of a form.
export const dividerStyle = css`
  :host { display: block; height: 100%; }

  .divider {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    align-items: center;
  }
  .line {
    flex: 1 1 auto;
    border-top: var(--se-hair);
  }
`
