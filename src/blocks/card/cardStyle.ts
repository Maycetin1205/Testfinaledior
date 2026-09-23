import { css } from 'lit'

export const cardsStyle = css`
  .card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 11px 13px 12px;
    background: var(--se-card-bg);
    border: var(--se-border) solid var(--se-card-line);
    border-radius: var(--se-r-md);
    font-family: var(--se-font);
    transition: border-color var(--se-move);
  }

  .card:hover { border-color: var(--se-faint); }

  :host([data-ff-selection]) .card {
    border-color: var(--se-accent);
    background: var(--se-accent-soft);
  }

  :host([data-ff-dragging]) .card {
    opacity: 0.45;
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
    font-size: var(--se-fs-lg);
    font-weight: 700;
    line-height: 1.25;
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
    margin-top: 9px;
    color: var(--se-ink);
    font-size: var(--se-fs);
    line-height: 1.45;
  }

  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
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
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    margin-left: auto;
    padding: 5px 11px 5px 9px;
    border-radius: var(--se-r-sm);

    clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.02em;
    color: var(--se-ink);
    background: var(--tone-soft);
    white-space: nowrap;
  }

  .chip::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--tone-strong);
  }

  :host([data-ff-editor]) [data-ff-spot]:empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
