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
    min-width: 232px;
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

  /* A place of a column with more than one: a box in the box. */
  .place {
    flex: none;
    border: 1.5px solid var(--tone-line);
    border-radius: var(--se-radius);
    background: var(--se-panel);
    overflow: hidden;
  }

  .place-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--tone-soft);
  }
  .place-head .head-text { font-size: var(--se-fs-sm); }

  .place-count {
    flex: none;
    margin-left: auto;
    font-family: var(--se-mono);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--tone-ink);
  }

  .place-body {
    display: flex;
    flex-direction: column;
    gap: var(--se-gap);
    padding: 10px;
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

  /* The avatar beside name and subline, as .vkarte-haupt holds them. */
  .main {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    min-width: 0;
  }

  .ident {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* Name and subline on one line, as .vkarte-zeile1. */
  .line {
    display: flex;
    align-items: baseline;
    gap: 7px;
    min-width: 0;
  }

  .avatar {
    box-sizing: border-box;
    flex: none;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: var(--se-radius);
    background: no-repeat center / cover;
    color: var(--se-animal-paw);
  }
  .avatar svg { width: 88%; height: 88%; stroke-width: 2; }

  /* A bound avatar has a dotted edge in the editor, as a bound form field. */
  :host([preview]) .avatar[data-ff-bound] { border: var(--se-border) dotted var(--se-accent); }
  :host([preview][data-editable]) .avatar { cursor: pointer; }

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
    font-size: var(--se-fs-name);
    font-weight: 600;
  }
  .meta {
    flex: none;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    white-space: nowrap;
  }
  .owner {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
  }

  .time {
    flex: none;
    color: var(--se-faint);
    font-size: var(--se-fs-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* The flags of the card, as .vkarte-flags. */
  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
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

  /* The line of information under the text, as .vkarte-info-zeile. */
  .date {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* How far the time lies from now, as .vinfo; past it, as .vinfo.spaet. */
  .until {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 500;
    white-space: nowrap;
  }
  .until.late { color: var(--se-danger); }

  /* The line before each hour of a column by the clock, as .vstunde. */
  .hour {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 4px 0;
    color: var(--se-muted);
    font-family: var(--se-font);
    font-size: var(--se-fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .07em;
  }
  .hour::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--se-line);
  }

  /* The line of now, as .vjetzt. */
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

  /* The button under the card, as .vbtn-aktion: in the tone of the column it
     leads to. */
  .advance {
    box-sizing: border-box;
    width: 100%;
    height: var(--se-control);
    border: none;
    border-radius: var(--se-radius);
    background: var(--tone-tint);
    color: var(--tone-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .advance:hover { filter: brightness(.96); }

  /* .va-abrechnung */
  .advance.action {
    --tone-tint: var(--se-accent-soft);
    --tone-ink: var(--se-accent-dark);
  }

  :host([preview]) [data-ff-spot]:not([data-ff-bound]):empty::before,
  :host([preview]) .advance:empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
