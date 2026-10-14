import { css } from 'lit'

// The table and the capture are ruled like an invoice, in a box with a line
// (14.10.): the head semibold in the second ink on a light ground over the
// line, rows apart by a faint line, faint lines between the columns, the
// figures right. Under the rows there are, empty rows rule the room down to
// the foot.
export const tableStyle = css`
      :host { min-width: 0; height: 100%; }

      .table {
        --se-cell-x: 10px;
        --se-input-x: 4px;

        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--se-panel);
        border: var(--se-hair);
        border-radius: var(--se-radius);
        overflow: hidden;
        font-family: var(--se-font);
        font-size: var(--se-fs-lg);
        font-weight: 600;
        color: var(--se-ink);
      }

      .search-row {
        padding: 8px var(--se-cell-x);
        border-bottom: var(--se-border) solid var(--se-line-soft);
      }
      /* .vsuche-top: the magnifier stands in the field, left of the text. */
      .search {
        position: relative;
        display: flex;
        align-items: center;
        max-width: 440px;
      }
      /* .vsuche-ic */
      .search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        color: var(--se-faint);
        pointer-events: none;
      }
      .search-icon svg { width: 16px; height: 16px; }
      /* The search keeps its ground, as the typing line of the sample (.cell);
         the text starts 8px after the magnifier. */
      .search-row input {
        box-sizing: border-box;

        width: 100%;
        height: 32px;
        padding: 0 10px 0 34px;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 600;
        line-height: var(--se-lh);
        color: var(--se-ink);
        background: var(--se-panel-2);
        border: 0;
        border-radius: var(--se-radius);
        transition: background-color var(--se-move);
      }
      .search-row input:hover { background: var(--se-hover); }
      .search-row input:focus {
        outline: none;
        background: var(--se-panel);
        box-shadow: var(--se-focus-ring);
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
        background: var(--se-head-ground);
        border-bottom: var(--se-border) solid var(--se-head-line);
        font-size: var(--se-fs-rubric);
        font-weight: 600;
        color: var(--se-ink-2);
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

      /* The room under the records holds empty rows down to the foot, as a
         ledger keeps its lines where no entry is yet (14.10.); the column
         lines run through them. */
      .ruler {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }

      .row {
        border-bottom: var(--se-border) solid var(--se-line-soft);
        background: var(--se-panel);
        transition: background-color var(--se-move);
      }

      /* A row under the pointer lifts from the sheet. Only a row without a
         status does: the status color is the message. */
      .body > .row:not([data-status]):hover {
        background: var(--se-row-hover);
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
      /* The chosen row, as in every list of the mask: the soft accent with
         the accent bar at its left edge; its words keep their ink. */
      .row.selected { box-shadow: var(--se-mark-bar); }
      .head > div,
      .row > div {
        padding: 0 var(--se-cell-x);
        line-height: calc(var(--row-height) - 1px);
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* A column that stands right, with its sum: the figures line up. */
      .row > div.right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .head > div.right { justify-content: flex-end; text-align: right; }

      /* The faint lines between the columns, through head and rows; in a grey
         line between its own cells. */
      .head > div + div,
      .row > [role='cell']:not(.sub) + [role='cell']:not(.sub),
      .row > .sub + .sub { box-shadow: var(--se-col-edge); }

      /* A record with a grey line is two lines high: the row on top and,
         under a cell of it, the column anchored there, as wide as the cell.
         Its name stands small and grey before the value. A record without
         a value there stays one line high. */
      .row.subline {
        height: calc(var(--row-height) + var(--sub-height));
        grid-template-rows: calc(var(--row-height) - var(--se-border)) var(--sub-height);
      }
      .row.subline > [role='cell']:not(.sub) { grid-row: 1; }
      .row > .sub {
        grid-row: 2;
        display: flex;
        align-items: center;
        gap: var(--se-gap-sm);
        line-height: var(--sub-height);
        font-size: var(--se-fs-sm);
        color: var(--se-ink-2);
      }
      .row > .sub.right { justify-content: flex-end; }
      .sub > .head-text { flex: none; color: var(--se-ink-2); }
      .sub > .sub-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* A cell of the grey line that takes typing lets the suggestion list
         hang out; its input is as small as the line. */
      .row > .sub.typable { overflow: visible; }
      .sub > .cell-holder { flex: 1 1 0; }
      .sub .cell-input {
        height: calc(var(--sub-height) - 4px);
        font-size: var(--se-fs-sm);
      }

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
      /* The star of a required column, as the reception mask marks its fields. */
      .head > div > .required {
        flex: none;
        margin-left: 3px;
        color: var(--se-danger);
        font-style: normal;
      }
      /* Breaks only between words; a word too long for the column is cut off. */
      .head .head-text {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        overflow-wrap: normal;
        word-break: normal;
        hyphens: none;
      }
      /* A narrow column: its head keeps its words whole by going smaller and
         tighter instead of being cut off. */
      .head > div { container-type: inline-size; }
      @container (max-width: 84px) {
        .head-text { font-size: var(--se-fs-xs); }
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
          var(--se-ink-2) 4px,
          var(--se-ink-2) 7px,
          transparent 7px
        );
      }

      .sort-arrow { font-size: var(--se-fs-xs); color: var(--se-ink-2); }

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
        padding: 6px;
        background: var(--se-panel);
        border-radius: var(--se-radius);
        box-shadow: var(--se-shadow-pop);
      }
      .picker-title {
        margin: 0;
        padding: 3px 8px 5px;
        font-size: var(--se-fs-sm);
        font-weight: 600;
        color: var(--se-ink-2);
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
        font-weight: 600;
        text-align: left;
        color: var(--se-ink);
        background: none;
        border: 0;
        border-radius: var(--se-radius-sm);
        cursor: pointer;
      }
      .picker-row:hover:not(:disabled),
      .picker-all:hover { background: var(--se-hover); }
      .picker-row:disabled { cursor: default; opacity: 0.55; }
      .picker-row:not(.checked) { color: var(--se-ink-2); }
      .picker-check {
        flex: none;
        width: 12px;
        color: var(--se-ink);
      }
      .picker-all {
        margin-top: 3px;
        padding-top: 6px;
        border-top: var(--se-border) solid var(--se-line-soft);
        color: var(--se-ink);
        font-weight: 700;
      }

      .row > div { color: var(--se-ink); }

      .foot {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 36px;
        padding: 4px var(--se-cell-x);
        border-top: var(--se-border) solid var(--se-line-soft);
        font-size: var(--se-fs-sm);
        color: var(--se-ink-2);
        white-space: nowrap;
        overflow: hidden;
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
        border-radius: var(--se-radius-sm);
      }

      .totals {
        display: flex;
        align-items: baseline;
        gap: var(--se-gap-lg);
      }
      /* .sum-l and .sum */
      .total-title { color: var(--se-ink-2); font-weight: 700; }
      .totals b {
        color: var(--se-ink);
        font-size: var(--se-fs-name);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .page-nav button {
        box-sizing: border-box;
        height: 26px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        font-weight: 700;
        padding: 0 8px;
        border: 0;
        border-radius: var(--se-radius-sm);
        background: var(--se-panel-2);
        color: var(--se-ink);
        cursor: pointer;
      }
      .page-nav button:hover:not(:disabled) { background: var(--se-hover); }
      .page-nav button:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
      .page-nav button:disabled {
        opacity: 0.3;
        cursor: default;
      }
`
