import { css } from 'lit'
import { chipShape } from '../parts/chip'

export const textStyle = css`
  .text {
    font-family: var(--se-font);

    --text-line-height: var(--se-lh);
    line-height: var(--text-line-height);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* The text is as high as its lines, an empty one as high as one line; the
     frame follows the text, not the other way round. */
  .text:empty { min-height: calc(1em * var(--text-line-height)); }

  /* .vmodal-titel */
  .variant-title {
    color: var(--se-ink);
    font-size: var(--se-fs-title);
    font-weight: 700;
    --text-line-height: var(--se-lh-tight);
  }

  /* .vspalte-kopf h2 */
  .variant-heading {
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 600;
    --text-line-height: var(--se-lh-tight);
    white-space: nowrap;
  }

  /* .vfeld-label */
  .variant-label {
    color: var(--se-muted);
    font-size: var(--se-fs-head);
    font-weight: 600;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .variant-body {
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 400;
  }

  /* .vkarte-meta */
  .variant-muted {
    overflow: hidden;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* .num */
  .variant-number {
    color: var(--se-ink);
    font-family: var(--se-mono);
    font-size: var(--se-fs);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
  }

  .align-center { text-align: center; }
  .align-right { text-align: right; }

  /* Nur Schrift is the plain text: a color gives it the ink of its tone,
     Neutral leaves it the ink of its role. */
  .text.emphasis-text:not(.tone-neutral) { color: var(--look-ink); }

  /* Fläche voll, Fläche leicht and Nur Rand make the text a chip, as .vflag:
     as wide as its words, on the ground of its emphasis, the line drawn
     inside. It stands where its text would. */
  .text:not(.emphasis-text) {
    box-sizing: border-box;
    width: fit-content;
    max-width: 100%;
    ${chipShape}
    background: var(--look-ground);
    color: var(--look-ink);
    outline: var(--se-border) solid var(--look-edge);
    outline-offset: calc(-1 * var(--se-border));
  }
  .align-center:not(.emphasis-text) { margin-inline: auto; }
  .align-right:not(.emphasis-text) { margin-left: auto; }
`
