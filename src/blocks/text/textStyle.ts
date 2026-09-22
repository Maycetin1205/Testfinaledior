import { css } from 'lit'

export const textStyle = css`
  .text {
    font-family: var(--se-font);

    --text-zeilenhoehe: var(--se-lh);
    line-height: var(--text-zeilenhoehe);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .text:empty { min-height: calc(1em * var(--text-zeilenhoehe)); }
`
