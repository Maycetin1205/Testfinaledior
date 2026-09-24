import { css } from 'lit'

export const buttonStyle = css`
  button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--se-gap-sm);
    padding: 7px 13px;
    cursor: pointer;
    border-radius: var(--se-radius);
    border: var(--se-border) solid var(--se-line);
    background: var(--se-panel);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 550;
    line-height: var(--se-lh);
    white-space: nowrap;

    transition: background var(--se-move), border-color var(--se-move);
  }
  button:hover { background: var(--se-accent-soft); border-color: var(--se-accent); }

  /* One line as .vbtn; a label wider than the button ends in an ellipsis. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* .vbtn-primaer */
  .variant-primary { background: var(--se-accent); border-color: var(--se-accent); color: var(--se-panel); }
  .variant-primary:hover { background: var(--se-accent-dark); border-color: var(--se-accent-dark); }

  /* .vbtn-leise */
  .variant-quiet {
    padding: 5px 10px;
    border-color: transparent;
    background: var(--se-accent-soft);
    color: var(--se-accent-dark);
  }
  .variant-quiet:hover { border-color: var(--se-accent); }

  /* .vbtn-ghost */
  .variant-ghost { border-color: transparent; background: transparent; color: var(--se-muted); }
  .variant-ghost:hover { background: var(--se-bg); color: var(--se-ink); }

  button:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 2px; }

  :host([fills]) button { width: 100%; height: 100%; }
`
