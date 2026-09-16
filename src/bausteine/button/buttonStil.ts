// Das Aussehen der Schaltflaeche: ein Knopf in der Akzentfarbe der Maske.
import { css } from 'lit'

export const buttonStil = css`
  button {
    box-sizing: border-box;
    padding: 7px 16px;
    cursor: pointer;
    border-radius: var(--se-r-md);
    border: var(--se-border) solid var(--se-accent);
    background: var(--se-accent);
    color: var(--se-panel);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;

    line-height: 1.2;

    transition: background-color var(--se-move), border-color var(--se-move);
  }
  button:hover { background: var(--se-accent-dark); border-color: var(--se-accent-dark); }

  button:active { background: var(--se-accent-dark); border-color: var(--se-ink); }
  button:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 2px; }

  :host([fuellt]) button { width: 100%; height: 100%; }
`
