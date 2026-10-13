import { css } from 'lit'

// Board, columns and cards in the language of the sample
// docs/design/behandlung-modern.html: a column is a softly tinted surface
// without a border, its head the title as text beside a dot of its color and
// the count; the cards on it are white with a soft shadow, the avatar in its
// circle, the name bold.
export const kanbanStyle = css`
  :host { min-width: 0; height: 100%; display: flex; flex-direction: column; }

  .board {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    box-sizing: border-box;
  }

  .column {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 232px;
    min-height: 0;
    overflow: hidden;
    background: var(--tone-shell);
    border-radius: var(--se-radius-card);
    box-shadow: var(--se-column-edge);
    font-family: var(--se-font);
  }

  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 16px;
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tone-strong);
  }

  .head-text {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 700;
    letter-spacing: -.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* .card .hd .cnt: the count as grey text. */
  .count {
    color: var(--se-muted);
    font-size: var(--se-fs-lg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .body {
    padding: 0 10px 10px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* A place of a column with more than one: a room on the column, white,
     its name small above the cards. The places share the height of the
     column: each keeps its cards and takes an equal part of what is left, so
     an empty room is a room, not a strip. */
  .place {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    border-radius: var(--se-radius);
    background: var(--se-place-ground);
    overflow: hidden;
  }

  .place-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 4px;
  }
  .place-head .head-text {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
  }

  .place-count {
    flex: none;
    margin-left: auto;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .place-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    gap: 8px;
    padding: 4px 8px 8px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Where a dragged card would land. */
  .column.target .body,
  .place.target .place-body {
    background: color-mix(in oklab, var(--tone-strong) 8%, transparent);
    outline: 2px dashed var(--tone-strong);
    outline-offset: -2px;
  }

  .card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--se-card-bg);
    border-radius: var(--se-radius);
    box-shadow: var(--se-shadow-tile);
    font-family: var(--se-font);
    transition: box-shadow var(--se-move), background-color var(--se-move);
  }

  /* As a row of every list: a ground under the pointer, chosen soft blue
     with the accent bar at the left edge. */
  .card:hover {
    background: var(--se-row-hover);
    box-shadow: var(--se-shadow-tile-hover);
  }

  .card.chosen {
    background: var(--se-selection);
    box-shadow: var(--se-shadow-chosen);
  }

  .card.dragging { opacity: 0.55; }

  /* The avatar beside name and subline. */
  .main {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  .ident {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Name and subline on one line. */
  .line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .name,
  .owner {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 700;
  }
  .meta {
    flex: none;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  .owner {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 600;
  }

  .time {
    flex: none;
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* The flags of the card. */
  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    color: var(--se-ink-2);
    font-size: var(--se-fs);
    font-weight: 600;
    line-height: var(--se-lh);
  }

  /* The line of information under the text. */
  .date {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* How far the time lies from now; past it, red. */
  .until {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  .until.late { color: var(--se-danger); }

  /* The line before each hour of a column by the clock. */
  .hour {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 4px 0;
    color: var(--se-muted);
    font-family: var(--se-font);
    font-size: var(--se-fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .hour::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--se-line);
  }

  /* The line of now. */
  .now {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 1px 4px;
    color: var(--se-danger);
    font-family: var(--se-font);
    font-size: var(--se-fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .now::before {
    content: '';
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--se-danger);
  }
  .now::after {
    content: '';
    flex: 1;
    height: 2px;
    background: var(--se-danger);
  }

  /* The button under the card, a soft button (.btn.sec) in the tone of the
     column it leads to. */
  .advance {
    box-sizing: border-box;
    width: 100%;
    height: 32px;
    border: none;
    border-radius: var(--se-radius);
    background: var(--tone-tint);
    color: var(--tone-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .advance:hover { background: color-mix(in oklab, var(--tone-tint), var(--tone-strong) 10%); }
  .advance:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }

  /* The action of the last column: the blue of the mask. */
  .advance.action {
    --tone-tint: var(--se-accent-soft);
    --tone-ink: var(--se-accent-dark);
    --tone-strong: var(--se-accent);
  }

  :host([preview]) [data-ff-spot]:not([data-ff-bound]):not(.avatar):empty::before,
  :host([preview]) .advance:empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
