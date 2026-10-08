import { css } from 'lit'

// A dense list as the table draws its rows: a line between the rows, the
// chosen ones in the selection color.
export const dataListStyle = css`
  :host { min-width: 0; height: 100%; }

  .list {
    box-sizing: border-box;
    height: 100%;
    overflow: auto;
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  .row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--se-gap);
    width: 100%;
    min-height: var(--se-control);
    padding: 4px var(--se-gap);
    background: var(--se-panel);
    border: 0;
    border-bottom: var(--se-border) solid var(--se-line-soft);
    transition: background-color var(--se-move);
    cursor: pointer;
  }

  .row:hover { background: var(--se-accent-soft); }
  .row.chosen { background: var(--se-selection); }

  /* Keine: the rows are only read. */
  .pick-none .row { cursor: default; }
  .pick-none .row:hover { background: var(--se-panel); }

  .row:focus-visible,
  .row:has(input:focus-visible) {
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }

  input[type='checkbox'] {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--se-accent);
  }

  .avatar {
    box-sizing: border-box;
    flex: none;
    width: var(--se-control);
    height: var(--se-control);
    display: grid;
    place-items: center;
    border-radius: var(--se-radius);
    color: var(--se-animal-paw);
  }
  .avatar svg { width: 88%; height: 88%; stroke-width: 2; }

  /* A bound avatar has a dotted edge in the editor, as on the card. */
  :host([preview]) .avatar[data-ff-bound] { border: var(--se-border) dotted var(--se-accent); }
  :host([preview][data-editable]) .avatar { cursor: pointer; }

  /* .vpet-id: the name, the subline below it. */
  .ident {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: var(--se-lh-tight);
  }

  .name,
  .meta {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name { font-weight: 600; }
  .meta {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
  }

  :host([preview]) .row { cursor: default; }
  :host([preview]) input { pointer-events: none; }

  :host([preview]) [data-ff-spot]:not([data-ff-bound]):empty::before {
    content: '—';
    color: var(--se-faint);
  }
`
