import { css } from 'lit'

export const dateStyle = css`
  .picker {
    --tag-h: 34px;

    --tag-feld-min: 112px;
    display: flex;
    align-items: stretch;
    gap: var(--se-gap-sm);
    height: var(--tag-h);
    font-family: var(--se-font);
  }

  .stepper {
    box-sizing: border-box;
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 2px;
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-r-sm);
    background: var(--se-panel);
  }

  .arrow {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    padding: 0;
    border: none;
    border-radius: var(--se-r-sm);
    background: transparent;
    color: var(--se-muted);
    font-family: var(--se-font);
    font-size: var(--se-fs-lg);
    line-height: 1;
    cursor: pointer;
  }
  .arrow:hover { background: var(--se-panel-2); color: var(--se-ink); }

  .field {
    box-sizing: border-box;

    flex: 1;
    min-width: var(--tag-feld-min);
    border: none;
    background: transparent;
    padding: 0 2px;
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 600;
    color: var(--se-ink);
    text-align: center;
  }
  .field:focus { outline: none; }

  .today {
    box-sizing: border-box;
    flex: none;
    height: 100%;
    padding: 0 9px;
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-r-sm);
    background: var(--se-panel);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs-sm);
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;
  }
  .today:hover { border-color: var(--se-accent); color: var(--se-accent); }

  :host { container-type: inline-size; }
  @container (max-width: 210px) {
    .today { display: none; }
  }
  @container (max-width: 160px) {
    .picker { --tag-feld-min: 80px; }
  }

  :host([data-ff-editor]) .field,
  :host([data-ff-editor]) .arrow,
  :host([data-ff-editor]) .today { pointer-events: none; }

  :host([fills]) .picker { height: 100%; }
`
