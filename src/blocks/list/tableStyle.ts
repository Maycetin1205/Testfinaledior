import { css } from 'lit'

export const tableStyle = css`
      :host { min-width: 0; height: 100%; }

      .table {
        --se-cell-x: 8px;
        --se-input-x: 4px;

        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-radius);
        overflow: hidden;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        color: var(--se-ink);
      }

      .search-row {
        padding: 6px 8px;
        border-bottom: var(--se-border) solid var(--se-line-soft);
      }
      .search-row input {
        box-sizing: border-box;

        width: 100%;
        max-width: 440px;
        padding: 7px 10px;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        line-height: var(--se-lh);
        color: var(--se-ink);
        background: var(--se-panel-2);
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-radius);
        transition: border-color var(--se-move), box-shadow var(--se-move);
      }
      .search-row input::placeholder { color: var(--se-muted); opacity: 1; }
      .search-row input:focus {
        outline: none;
        background: var(--se-panel);
        border-color: var(--se-accent);
        box-shadow: var(--se-focus);
      }

      .head {
        display: grid;
        min-height: var(--row-height);
        box-sizing: border-box;
      }
      .row {
        display: grid;
        height: var(--row-height);
        box-sizing: border-box;
      }

      .head {
        position: sticky;
        top: 0;
        z-index: 1;
        flex: none;
        background: var(--se-panel);
        border-bottom: var(--se-border) solid var(--se-line-soft);
        font-size: var(--se-fs-xs);
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: var(--se-muted);
      }

      .body {
        flex: 1 1 auto;
        overflow: auto;

        /* No reserved gutter: in a short list it would stand as a gap beside
           the last column. */
        scrollbar-width: thin;
        display: flex;
        flex-direction: column;
      }

      .body > .row { flex: none; }

      .ruler {
        flex: 1 1 auto;
        min-height: 0;

        background-image:
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--row-height) - 1px),
            var(--se-line-soft) calc(var(--row-height) - 1px),
            var(--se-line-soft) var(--row-height)
          );
        background-position: 0 0;

        display: grid;
      }

      .row {
        border-bottom: var(--se-border) solid var(--se-line-soft);
        background: var(--se-panel);
        transition: background-color var(--se-move);
      }

      /* Only a row without a status takes the hover color: the status color is
         the message. */
      .body > .row:not([data-status]):hover {
        background: var(--se-accent-soft);
      }

      .body > .row.selectable { cursor: pointer; }

      .body:focus { outline: none; }
      .body > .row:focus {
        outline: var(--se-border) solid var(--se-accent);
        outline-offset: calc(-1 * var(--se-border));
      }
      .body > .row:focus:not(:focus-visible) { outline: none; }

      .row.selected,
      .row:focus-visible,
      .body > .row.selected:not([data-status]):hover,
      .body > .row:not([data-status]):focus-visible:hover {
        background: var(--se-selection);
      }
      .body > .row.selected,
      .body > .row.selected:focus:not(:focus-visible) {
        outline: var(--se-border) solid var(--se-accent);
        outline-offset: calc(-1 * var(--se-border));
      }
      .row.selected > div,
      .row:focus-visible > div { color: var(--se-ink); }
      .head > div,
      .row > div {
        padding: 0 var(--se-cell-x);
        line-height: calc(var(--row-height) - 1px);
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .row > div.number {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .head > div.number { justify-content: flex-end; text-align: right; }

      /* Two title lines fit exactly one tick: the page count takes the head for
         one row, anything taller would scroll the body. */
      .head > div {
        display: flex;
        align-items: center;
        line-height: calc((var(--tick) - var(--se-border)) / 2);
        white-space: normal;
        cursor: pointer;
        user-select: none;

        position: relative;
      }
      .head-text {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        overflow-wrap: break-word;
        -webkit-hyphens: auto;
        hyphens: auto;
      }

      /* A grid child of its own that hangs over the column line, which alone is
         too thin to grab; inside the head cell its overflow would clip it. */
      .width-handle {
        position: relative;
        z-index: 2;
        justify-self: end;
        width: 11px;
        margin-right: -5px;
        cursor: col-resize;

        /* Otherwise a finger scrolls the table instead of dragging. */
        touch-action: none;
      }
      .width-handle:hover {
        background: linear-gradient(
          to right,
          transparent 4px,
          var(--se-accent) 4px,
          var(--se-accent) 7px,
          transparent 7px
        );
      }

      .sort-arrow { font-size: var(--se-fs-xs); color: var(--se-muted); }

      /* Only dimmed in the editor: it is a real column the builder still edits. */
      :host([preview]) .hidden { opacity: 0.45; }

      /* The picker lies inside the table, which clips whatever hangs out. */
      .picker-backdrop {
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 4;
      }
      .column-picker {
        position: absolute;
        z-index: 5;
        display: flex;
        flex-direction: column;
        min-width: 160px;
        max-width: 260px;
        max-height: 70%;
        overflow-y: auto;
        padding: 4px;
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-radius);
      }
      .picker-title {
        margin: 0;
        padding: 3px 8px 5px;
        font-size: var(--se-fs-sm);
        font-weight: 600;
        color: var(--se-muted);
      }
      .picker-row,
      .picker-all {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 7px 9px;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        text-align: left;
        color: var(--se-ink);
        background: none;
        border: 0;
        border-radius: var(--se-radius);
        cursor: pointer;
      }
      .picker-row:hover:not(:disabled),
      .picker-all:hover { background: var(--se-accent-soft); }
      .picker-row:disabled { cursor: default; opacity: 0.55; }
      .picker-row:not(.checked) { color: var(--se-muted); }
      .picker-check {
        flex: none;
        width: 12px;
        color: var(--se-accent);
      }
      .picker-all {
        margin-top: 3px;
        padding-top: 6px;
        border-top: var(--se-border) solid var(--se-line);
        color: var(--se-accent-dark);
        font-weight: 600;
      }

      .row > div { color: var(--se-ink); }

      .foot {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 30px;
        padding: 3px 10px;
        border-top: var(--se-border) solid var(--se-line);
        font-size: var(--se-fs-sm);
        color: var(--se-muted);
        white-space: nowrap;
        overflow: hidden;
      }
      .foot--quiet {
        min-height: 0;
        height: 6px;
        padding: 0;
      }
      .page-info { flex: none; }
      .foot-right {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .page-nav {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      mark {
        padding: 0 1px;
        color: inherit;
        background: var(--se-warning-soft);
        border-radius: var(--se-radius);
      }

      .totals {
        display: flex;
        align-items: baseline;
        gap: var(--se-gap-lg);
      }
      .total-title { color: var(--se-muted); }
      .totals b {
        color: var(--se-ink);
        font-variant-numeric: tabular-nums;
      }

      .page-nav button {
        box-sizing: border-box;
        height: 22px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        padding: 2px 6px;
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-radius);
        background: var(--se-panel);
        color: var(--se-ink);
        cursor: pointer;
      }
      .page-nav button:disabled {
        opacity: 0.3;
        cursor: default;
      }
`
