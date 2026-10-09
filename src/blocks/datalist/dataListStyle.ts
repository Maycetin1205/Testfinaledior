import { css } from 'lit'

// The list of the sample docs/design/behandlung-modern.html (.dl): rows
// without lines between them, the avatar in its tinted circle, the name bold,
// the line under it grey, a short value on the right. Under the pointer a row
// lies on a ground, the chosen one is blue. On the ground of the page the
// list is a card of its own, inside a card it lies flat.
export const dataListStyle = css`
  :host { min-width: 0; height: 100%; }

  .list {
    box-sizing: border-box;
    height: 100%;
    overflow: auto;
    scrollbar-width: thin;
    background: var(--se-panel);
    border-radius: var(--se-radius-card);
    box-shadow: var(--se-surface-shadow);
    font-family: var(--se-font);
    font-size: var(--se-fs-lg);
    color: var(--se-ink);
  }

  /* .dl-row: the words 10 px in, as in a field. */
  .row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--se-radius);
    background: transparent;
    transition: background-color var(--se-move);
    cursor: pointer;
  }
  .row:has(.avatar) { min-height: 56px; }

  .row:hover { background: var(--se-panel-2); }
  .row.chosen { background: var(--se-selection); }
  .row.chosen .name { color: var(--se-accent-dark); }

  /* Keine: the rows are only read. */
  .pick-none .row { cursor: default; }
  .pick-none .row:hover { background: transparent; }

  .row:focus-visible,
  .row:has(input:focus-visible) {
    outline: 2px solid var(--se-accent);
    outline-offset: -2px;
  }

  /* .t1 and .t2: the name, the line under it. */
  .ident {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name,
  .meta,
  .aside {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    font-weight: 700;
    line-height: 18px;
  }
  .meta {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    line-height: 16px;
  }

  /* .meta of the sample: the short value on the right. */
  .aside {
    flex: none;
    max-width: 40%;
    color: var(--se-ink-2);
    font-size: var(--se-fs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  :host([preview]) .row { cursor: default; }
  :host([preview]) input { pointer-events: none; }

  :host([preview]) [data-ff-spot]:not([data-ff-bound]):not(.avatar):empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
