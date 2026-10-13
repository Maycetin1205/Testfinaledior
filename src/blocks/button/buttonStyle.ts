import { css, unsafeCSS } from 'lit'
import { rowsHigh } from '../../core/block/grid'

// The button of the sample docs/design/behandlung-modern.html (.btn): bold
// words, the radius of a field, no line of its own. Color and emphasis come
// from lookStyle: Fläche voll is .btn.pri, Fläche leicht .btn.sec, Nur
// Schrift .btn.txt and, in red, .btn.dan; Nur Rand draws the line of its
// tone. Klein and Normal stand one line high, Groß as high as a field with
// its label, as the buttons of the sample.
export const buttonStyle = css`
  button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--se-gap);
    width: 100%;
    height: ${unsafeCSS(rowsHigh(2))}px;
    padding: 0 14px;
    cursor: pointer;
    border-radius: var(--se-radius);
    border: var(--se-border) solid var(--look-edge);
    background: var(--look-ground);
    color: var(--look-ink);
    font-family: var(--se-font);
    font-size: var(--look-fs);
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;

    transition: background-color var(--se-move), border-color var(--se-move), color var(--se-move);
  }
  button.size-small { padding: 0 10px; }
  button.size-large {
    height: ${unsafeCSS(rowsHigh(3))}px;
    padding: 0 18px;
  }

  button:hover { background: var(--look-ground-hover); border-color: var(--look-edge-hover); }
  /* Fläche leicht darkens a little under the pointer, as .btn.sec:hover,
     and keeps its edge away. */
  button.emphasis-soft:hover {
    background: color-mix(in oklab, var(--tone-soft), var(--tone-strong) 9%);
    border-color: transparent;
  }
  /* Nur Schrift: the ink of the tone, a neutral one the ink of a line of
     text; under the pointer the soft ground. */
  button.emphasis-text.tone-neutral { color: var(--se-ink-2); }

  /* One line; a label wider than the button ends in an ellipsis. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: var(--se-lh);
  }

  button:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
`
