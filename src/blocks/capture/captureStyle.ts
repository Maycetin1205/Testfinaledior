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

      .row.capture {
        flex: none;
        background: var(--se-panel);
        border-top: var(--se-border) solid var(--se-line);
      }

      /* In the editor the column titles stand where the mask shows its
         placeholders, in their color. */
      :host([data-ff-editor]) .row.capture > div { color: var(--se-faint); }

      .row.captured { flex: none; }
      :host(:not([data-ff-editor])) .row.captured { cursor: pointer; }

      /* Room for the status dot before the first cell. */
      .head > div:first-of-type,
      .row > div:first-of-type { padding-left: calc(var(--se-cell-x) + 14px); }

      /* Anchor for the status dot and the cross. */
      .row { position: relative; }
      .row[data-status]::before {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--se-faint);
        pointer-events: none;
      }

      .row.deleted > div { text-decoration: line-through; color: var(--se-muted); }

      .row[data-status="captured"] { background: var(--se-accent-soft); }
      .row[data-status="captured"]::before,
      .row[data-status="writes"]::before { background: var(--se-accent); }
      .row[data-status="changed"]::before,
      .row[data-status="deletion"]::before { background: var(--se-amber); }
      .row[data-status="deletion"] { background: var(--se-red-shell); }
      .row[data-status="writes"] { animation: se-writing 1.1s ease-in-out infinite; }
      .row[data-status="written"] { color: var(--se-muted); }
      .row[data-status="error"] { background: var(--se-red-shell); }
      .row[data-status="error"]::before { background: var(--se-red); }
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
        border-radius: var(--se-r-sm);
        cursor: pointer;
        opacity: 0;
      }
      .row:hover .row-remove,
      .row.deleted .row-remove,
      .row-remove:focus { opacity: 1; }
      .row-remove:hover { color: var(--se-red); background: var(--se-red-soft); }

      .row-remove.row-remove-static { opacity: 1; cursor: default; }

      /* A typable cell hands its padding to its input, so the text keeps the
         edge of every other cell, and lets the suggestion list hang out. */
      .row > div.typable,
      .row.capture > div {
        display: flex;
        align-items: center;
        overflow: visible;
        padding: 0 calc(var(--se-cell-x) - var(--se-input-x) - var(--se-border));
      }
      .row > div.typable:first-of-type,
      .row.capture > div:first-of-type {
        padding-left: calc(var(--se-cell-x) + 14px - var(--se-input-x) - var(--se-border));
      }
`
