import { css } from 'lit'

// The roles of the sample docs/design/behandlung-modern.html. A text stands
// at the edge of its frame, flush with the inner edge of the box around it
// (paper look, 14.10.).
export const textStyle = css`
  /* The frame is the room of the block on the grid; the text in it is as
     high as its lines and stands at its top, unless the area around it
     centers its texts, as the band does. */
  .frame {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: var(--se-text-justify, flex-start);
  }
  .frame > .text { flex: none; }

  /* Beschriftung: the Rubrik over the text, as .label over the value of a
     field: the same type on a 14 px line, 6 px above it and 1 px under it,
     so a text and a field with their labels stand on one line and are as
     high. A label is the second ink in small capitals; a value the first,
     semibold. */
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
    padding-inline: 0;
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-rubric);
    font-weight: 600;
    letter-spacing: .07em;
    text-transform: uppercase;
    line-height: 14px;
  }

  .text {
    box-sizing: border-box;
    padding-inline: 0;
    font-family: var(--se-font);

    --text-line-height: var(--se-lh);
    line-height: var(--text-line-height);
    white-space: pre-wrap;
    overflow-wrap: anywhere;

    /* The text is as high as its lines, an empty one as high as one line;
       the frame follows the text, not the other way round. */
    min-height: calc(1em * var(--text-line-height));
  }

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

  /* Rubrik: a label over or beside a value, in small capitals of the
     accent. */
  .variant-rubric {
    padding-top: 2px;
    color: var(--se-accent);
    font-size: var(--se-fs-rubric);
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
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

  /* Linie: the text stands on a hairline, as on a form; while it is bound
     and empty the line still shows where the value will be. The least
     height counts the room under the words as well (border-box), so the
     line stays where it is when a value comes or goes (user, 14.10.: it
     slid down by those 3 px). */
  .text.lined {
    --text-line-room: 3px;
    padding-bottom: var(--text-line-room);
    min-height: calc(1em * var(--text-line-height) + var(--text-line-room));
    box-shadow: var(--se-field-line);
  }

  /* The symbol before the words, as in .lines .row: in the middle of the
     first line, a little larger than the type, faint. */
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
  .symbol .icon { width: 1.15em; height: 1.15em; }
  .with-symbol .words { min-width: 0; }
`
