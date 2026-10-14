import { css } from 'lit'

// Board, columns and cards as Fachsoftware (Tonprobe 3, 14.10.): a column is
// a quiet grey surface in the hairline, its color only in the dot of its
// head beside the title and the count; the cards on it are white in the
// hairline, the avatar in its tinted circle, the name bold. A card with a
// flag wears a stripe of the flag's color at its left edge. Under the
// pointer a card lifts; dragged, it rises on the one shadow of the mask.
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
    background: var(--se-neutral-shell);
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

  /* .card .hd .cnt: the count in the second ink. */
  .count {
    color: var(--se-ink-2);
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
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
  }

  .place-count {
    flex: none;
    margin-left: auto;
    color: var(--se-ink-2);
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
    position: relative;
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

  /* As a row of every list: a ground under the pointer, chosen the soft
     accent with the accent bar at the left edge. */
  .card:hover {
    background: var(--se-row-hover);
    box-shadow: var(--se-shadow-tile-hover);
  }

  .card.chosen {
    background: var(--se-selection);
    box-shadow: var(--se-shadow-chosen);
  }

  /* The flag of the card as a stripe at its left edge, in the color of the
     flag. On a chosen card it lies over the accent bar; the ground shows the
     choice. */
  .card.flagged::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    border-radius: var(--se-radius) 0 0 var(--se-radius);
    background: var(--tone-strong);
  }

  /* The card being dragged rises from its column. */
  .card.dragging {
    z-index: 1;
    box-shadow: var(--se-shadow-lift);
  }

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
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  .owner {
    color: var(--se-ink-2);
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
    color: var(--se-ink-2);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* How far the time lies from now; past it, red. */
  .until {
    color: var(--se-ink-2);
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
    color: var(--se-ink-2);
    font-family: var(--se-font);
    font-size: var(--se-fs-xs);
    font-weight: 700;
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

  /* The button under the card: white in the hairline, the first ink; a
     step darker under the pointer. Neither the tone of a column nor the
     accent: the board's buttons are no main button. */
  .advance {
    box-sizing: border-box;
    width: 100%;
    height: 32px;
    border: none;
    border-radius: var(--se-radius);
    background: var(--se-panel);
    box-shadow: var(--se-edge);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: background-color var(--se-move);
  }
  .advance:hover { background: var(--se-hover); }
  .advance:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }

  :host([preview]) [data-ff-spot]:not([data-ff-bound]):not(.avatar):empty::before,
  :host([preview]) .advance:empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
