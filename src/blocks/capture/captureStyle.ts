import { css } from 'lit'

export const captureStyle = css`
      /* Anchor for the lookup window in the editor, which covers the whole block. */
      :host { position: relative; }

      /* The capture row sticks to the bottom with paging too: otherwise the
         operator would type out of sight. */
      .body > .row.capture {
        position: sticky;
        bottom: 0;
        z-index: 1;
      }

      /* The capture row stands apart from the booked rows: a firm line above
         it, the light ground of a field. */
      .row.capture {
        flex: none;
        background: var(--se-panel-2);
        border-top: var(--se-border) solid var(--se-muted);
      }

      /* In the editor the column titles stand where the mask shows its
         placeholders, in their color. */
      :host([preview]) .row.capture [role='cell'] { color: var(--se-faint); }

      .row.captured { flex: none; }
      :host(:not([preview])) .row.captured { cursor: pointer; }

      /* Anchor for the cross. */
      .row { position: relative; }

      /* One sign per row state, the tone: the reception mask tones a table
         row on hover the same way and shows no dot inside a row. */
      .row[data-status="captured"],
      .row[data-status="writes"] { background: var(--se-accent-soft); }
      .row[data-status="changed"] { background: var(--se-warning-soft); }
      .row[data-status="error"] { background: var(--se-danger-soft); }
      .row[data-status="writes"] { animation: se-writing 1.1s ease-in-out infinite; }
      .row[data-status="written"] { color: var(--se-muted); }
      @keyframes se-writing { 50% { opacity: 0.55; } }
      @media (prefers-reduced-motion: reduce) {
        .row[data-status="writes"] { animation: none; }
      }

      /* Absolute, or the cross would push the value of the last cell aside. */
      .row-remove {
        position: absolute;
        right: 2px;
        top: 50%;
        transform: translateY(-50%);
        padding: 0 4px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        line-height: 1;
        color: var(--se-faint);
        background: var(--se-panel);
        border: 0;
        border-radius: var(--se-radius);
        cursor: pointer;
        opacity: 0;
      }
      .row:hover .row-remove,
      .row-remove:focus { opacity: 1; }
      .row-remove:hover { color: var(--se-danger); background: var(--se-danger-soft); }

      /* The chosen row is tinted at most, never framed. */
      .body > .row.selected,
      .body > .row:focus,
      .body > .row.selected:focus:not(:focus-visible) { outline: none; }

      /* A typable cell hands its padding to its input, so the text keeps the
         edge of every other cell, and lets the suggestion list hang out. */
      .row > div.typable,
      .row.capture [role='cell'] {
        overflow: visible;
        padding: 0 calc(var(--se-cell-x) - var(--se-input-x) - var(--se-border));
      }
      .row:not(.subline) > div.typable,
      .row.capture:not(.subline) [role='cell'] {
        display: flex;
        align-items: center;
      }

`
