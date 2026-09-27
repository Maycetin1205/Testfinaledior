import { css } from 'lit'

// Board, columns and cards as the reception mask draws them: a shell per
// column with a tinted head, a round dot and a count, white cards inside.
export const kanbanStyle = css`
  :host { min-width: 0; height: 100%; display: flex; flex-direction: column; }

  .board {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 15px;
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
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--tone-shell);
    border: 1.5px solid var(--tone-line);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
  }

  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 15px;
    background: var(--tone-tint);
    border-bottom: var(--se-border) solid var(--tone-line);
  }

  .dot {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--tone-strong);
  }

  .head-text {
    color: var(--tone-ink);
    font-size: var(--se-fs);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    margin-left: auto;
    min-width: 22px;
    padding: 1px 8px;
    border-radius: var(--se-radius);
    background: var(--se-panel);
    border: var(--se-border) solid var(--tone-line);
    text-align: center;
    font-family: var(--se-mono);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--tone-ink);
  }

  .body {
    padding: 11px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--se-gap);
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  /* Where a dragged card would land. */
  .column.target .body {
    background: color-mix(in oklab, var(--tone-strong) 8%, transparent);
    outline: 2px dashed var(--tone-strong);
    outline-offset: -2px;
  }

  .card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--se-gap-sm);
    padding: 8px;
    background: var(--se-card-bg);
    border: var(--se-border) solid var(--se-card-line);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    transition: border-color var(--se-move);
  }

  .card:hover { border-color: var(--se-card-hover); }

  .card.chosen {
    border-color: var(--se-accent);
    background: var(--se-accent-soft);
  }

  .card.dragging { opacity: 0.55; }

  .name,
  .extra {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    color: var(--se-ink);
    font-size: var(--se-fs-name);
    font-weight: 600;
    line-height: var(--se-lh-tight);
  }
  .extra {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
  }

  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    color: var(--se-ink);
    font-size: var(--se-fs);
    line-height: var(--se-lh);
  }

  .foot {
    display: flex;
    align-items: center;
    gap: var(--se-gap);
  }
  .foot-title {
    min-width: 0;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .date,
  .time {
    flex: none;
    color: var(--se-faint);
    font-size: var(--se-fs-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .chip {
    flex: none;
    margin-left: auto;
    padding: 2px 8px;
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs-chip);
    font-weight: 600;
    color: var(--tone-ink);
    background: var(--tone-soft);
    white-space: nowrap;
  }

  :host([preview]) [data-ff-spot]:empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
