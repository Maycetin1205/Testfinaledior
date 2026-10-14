import { css } from 'lit'
import { chipShape } from '../parts/chip'

// The roles of the sample docs/design/behandlung-modern.html. A plain text
// stands 10 px in from its frame, where the words of a field and a chip
// stand, so inside a card everything begins on the line of the title.
export const textStyle = css`
  /* The frame is the room of the block on the grid; the text in it is as
     high as its lines. */
  .frame {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .frame > .text { flex: none; }

  /* Beschriftung: the Rubrik over the text, as .label over the value of a
     field: the same type on a 14 px line, 6 px above it and 1 px under it,
     so a text and a field with their labels stand on one line and are as
     high. A label is the second ink, plain; a value the first, semibold. */
  .frame > .with-label {
    flex: none;
    display: flex;
    flex-direction: column;
    row-gap: 1px;
    padding-top: 6px;
  }
  .with-label > .text { flex: none; }
  .label {
    min-width: 0;
    padding-inline: 10px;
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-rubric);
    font-weight: 400;
    line-height: 14px;
  }

  .text {
    box-sizing: border-box;
    font-family: var(--se-font);

    --text-line-height: var(--se-lh);
    line-height: var(--text-line-height);
    white-space: pre-wrap;
    overflow-wrap: anywhere;

    /* The text is as high as its lines, an empty one as high as one line;
       the frame follows the text, not the other way round. */
    min-height: calc(1em * var(--text-line-height));
  }
  .text.emphasis-text { padding-inline: 10px; }

  /* The title of the sheet: 22 px, semibold, the first ink. */
  .variant-title {
    color: var(--se-ink);
    font-size: var(--se-fs-xl);
    font-weight: 600;
    letter-spacing: -.02em;
    --text-line-height: 1.2;
  }

  /* .card .hd h3 */
  .variant-heading {
    color: var(--se-ink);
    font-size: var(--se-fs-name);
    font-weight: 700;
    letter-spacing: -.01em;
    --text-line-height: var(--se-lh-tight);
    white-space: nowrap;
  }

  /* .f .l */
  .variant-label {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 400;
  }

  /* .lines .row: a value. */
  .variant-body {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 600;
  }

  /* .t-meta */
  .variant-muted {
    color: var(--se-ink-2);
    font-size: var(--se-fs);
    font-weight: 400;
  }

  /* .tbl .n */
  .variant-number {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  /* Rubrik: a label over or beside a value, plain in the second ink. */
  .variant-rubric {
    padding-top: 2px;
    color: var(--se-ink-2);
    font-size: var(--se-fs-rubric);
    font-weight: 400;
  }

  /* Kopf: a Rubrik, tight over its value. */
  .variant-head {
    color: var(--se-ink-2);
    font-size: var(--se-fs-head);
    font-weight: 400;
    --text-line-height: 1.1;
  }

  /* Hilfe: a quiet line under a part of the sheet. */
  .variant-hint {
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 400;
  }

  /* Betrag: a large figure, tight. */
  .variant-amount {
    color: var(--se-ink);
    font-size: var(--se-fs-xxl);
    font-weight: 700;
    letter-spacing: -.02em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    --text-line-height: 1.2;
  }

  .align-center { text-align: center; }
  .align-right { text-align: right; }

  /* Nur Schrift is the plain text: a color gives it the ink of its tone,
     Neutral leaves it the ink of its role. */
  .text.emphasis-text:not(.tone-neutral) { color: var(--look-ink); }

  /* Fläche voll, Fläche leicht and Nur Rand make the text a chip, as .alert:
     as wide as its words, on the ground of its emphasis, the line drawn
     inside. It stands where its text would. */
  .text:not(.emphasis-text) {
    width: fit-content;
    max-width: 100%;
    font-weight: 700;
    ${chipShape}
  }
  .align-center:not(.emphasis-text) { margin-inline: auto; }
  .align-right:not(.emphasis-text) { margin-left: auto; }

  /* The symbol before the words, as in .lines .row: in the middle of the
     first line, a little larger than the type, faint beside plain words and
     in the ink of a chip. */
  .with-symbol {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .with-symbol.align-center { justify-content: center; }
  .with-symbol.align-right { justify-content: flex-end; }
  .symbol {
    flex: none;
    display: grid;
    place-items: center;
    height: calc(1em * var(--text-line-height));
    color: var(--se-faint);
  }
  .text:not(.emphasis-text) .symbol { color: inherit; }
  .symbol .icon { width: 1.15em; height: 1.15em; }
  .with-symbol .words { min-width: 0; }

  /* In the editor, a bound value under its label: a quiet dash where the
     value will stand. The mask shows nothing there. */
  .empty .words::after {
    content: "–";
    color: var(--se-faint);
  }
`
