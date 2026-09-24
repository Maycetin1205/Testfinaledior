import { css } from 'lit'

export const dateStyle = css`
  .picker {
    --picker-height: 36px;

    --field-min: 128px;
    display: flex;
    align-items: stretch;
    gap: var(--se-gap-lg);
    height: var(--picker-height);
    font-family: var(--se-font);
  }

  .stepper {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 3px;
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-radius);
    background: var(--se-panel);
  }

  .arrow {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--se-radius);
    background: transparent;
    color: var(--se-muted);
    font-family: var(--se-font);
    font-size: var(--se-fs-lg);
    font-weight: 550;
    line-height: 1;
    cursor: pointer;
  }
  .arrow:hover { background: var(--se-hover); }

  .field {
    box-sizing: border-box;

    flex: 1;
    min-width: var(--field-min);
    border: none;
    background: transparent;
    padding: 0 4px;
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
    padding: 7px 13px;
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-radius);
    background: var(--se-panel);
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--se-move), border-color var(--se-move);
  }
  .today:hover { background: var(--se-accent-soft); border-color: var(--se-accent); }

  /* The day button goes first, then the field narrows: the stepper needs
     196px at full width, the day button 78px more. */
  :host { container-type: inline-size; }
  @container (max-width: 274px) {
    .today { display: none; }
  }
  @container (max-width: 196px) {
    .picker { --field-min: 80px; }
  }

  :host([preview]) .field,
  :host([preview]) .arrow,
  :host([preview]) .today { pointer-events: none; }

  :host([fills]) .picker { height: 100%; }
`
