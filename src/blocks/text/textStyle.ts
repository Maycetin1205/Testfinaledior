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
  .frame.away { visibility: hidden; }

  /* Unten ausrichten: the text at the bottom of its frame, its last baseline
     one row of the grid above the edge, so texts of any size whose frames end
     on one row stand on one line, and a sum rule under it keeps clear of the
     figures. */
  .frame.bottom > .text {
    margin-top: auto;
    padding-bottom: 12px;
    text-box-trim: trim-end;
    text-box-edge: text alphabetic;
  }

  /* Summenlinie: the rule over the frame and the double rule under it, as
     under the total of an invoice. They take no room, so a text beside
     keeps its line. */
  .frame.sum-rule { position: relative; }
  .frame.sum-rule::before,
  .frame.sum-rule::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
  }
  .frame.sum-rule::before { top: 0; border-top: var(--se-rule); }
  .frame.sum-rule::after { bottom: 0; border-bottom: 3px double var(--se-ink); }

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

  /* .pat .name */
  .variant-title {
    color: var(--se-ink);
    font-size: var(--se-fs-xl);
    font-weight: 700;
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
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 600;
  }

  /* .lines .row */
  .variant-body {
    color: var(--se-ink-2);
    font-size: var(--se-fs-lg);
    font-weight: 600;
  }

  /* .t-meta */
  .variant-muted {
    overflow: hidden;
    color: var(--se-muted);
    font-size: var(--se-fs);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* .tbl .n */
  .variant-number {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  /* Rubrik: small capitals, spaced and light, over or beside a value. */
  .variant-rubric {
    padding-top: 3px;
    color: var(--se-label);
    font-size: var(--se-fs-rubric);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--se-tracking-caps);
  }

  /* Kopf: a Rubrik, smaller, tight over its value. */
  .variant-head {
    color: var(--se-label);
    font-size: var(--se-fs-head);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--se-tracking-caps);
    --text-line-height: 1.1;
  }

  /* Hilfe: a quiet line under a part of the sheet. */
  .variant-hint {
    color: var(--se-label);
    font-size: var(--se-fs-sm);
    font-weight: 600;
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
  .with-symbol .words {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Einzeilig: one line, what is too long ends in an ellipsis. */
  .one-line,
  .one-line .words {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Leer zeigt Strich: a quiet dash where the value would stand. */
  .empty .words::after {
    content: "–";
    color: var(--se-label);
  }

  /* Ohne Auswahl: the hint stands in place of the value, quiet. */
  .text.hinting {
    color: var(--se-muted);
    font-size: var(--se-fs);
    font-weight: 600;
    letter-spacing: normal;
    text-transform: none;
  }

  /* Null oder weniger rot. */
  .text.not-positive,
  .text.not-positive.emphasis-text { color: var(--se-danger-ink); }
`
