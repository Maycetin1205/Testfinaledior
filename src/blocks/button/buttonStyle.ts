import { css } from 'lit'

// Color, emphasis and size come from lookStyle, as .vbtn of the reception
// mask: Neutral and Nur Rand is .vbtn, Petrol and Fläche voll .vbtn-primaer,
// Petrol and Fläche leicht .vbtn-leise, Neutral and Nur Schrift .vbtn-ghost.
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
    border: var(--se-border) solid var(--look-edge);
    background: var(--look-ground);
    color: var(--look-ink);
    font-family: var(--se-font);
    font-size: var(--look-fs);
    font-weight: 550;
    line-height: var(--se-lh);
    white-space: nowrap;

    transition: background var(--se-move), border-color var(--se-move);
  }
  button:hover { background: var(--look-ground-hover); border-color: var(--look-edge-hover); }

  /* One line as .vbtn; a label wider than the button ends in an ellipsis. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 2px; }

  :host([fills]) button { width: 100%; height: 100%; }
`
