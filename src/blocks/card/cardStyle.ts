import { css } from 'lit'

export const cardsStyle = css`
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

  :host([data-ff-selection]) .card {
    border-color: var(--se-accent);
    background: var(--se-accent-soft);
  }

  :host([data-ff-dragging]) .card {
    opacity: 0.55;
  }

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
