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

  button:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 2px; }

  :host([fills]) button { width: 100%; height: 100%; }
`
