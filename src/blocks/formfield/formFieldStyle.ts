import { css, unsafeCSS } from 'lit'
import { rowsHigh } from '../../core/block/grid'

// The field of the sheet: the label a Rubrik over the value, the value in a
// box with a line, as every field of a Windows program (14.10., the user on
// the field without one: „randlos“). Under the pointer the box lies on a
// ground, while typed into it is white with the ring of the accent. An empty
// field shows its label and nothing where the value would stand.
export const fieldStyle = css`
  .field {
    position: relative;
    box-sizing: border-box;
    height: ${unsafeCSS(rowsHigh(2))}px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-rows: 22px;
    align-content: center;
    padding: 0 10px;
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    cursor: text;
  }
  .field.labelled {
    height: ${unsafeCSS(rowsHigh(3))}px;
    grid-template-rows: 14px 22px;
    row-gap: 1px;
    align-content: start;
    padding-top: 6px;
  }
  .field:hover .value { background: var(--se-hover); }
  .field:focus-within .value {
    background: var(--se-panel);
    border-color: var(--se-accent);
    box-shadow: var(--se-focus-ring);
  }

  /* The label as a Rubrik: plain, in the second ink. */
  .label {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    color: var(--se-ink-2);
    font-size: var(--se-fs-rubric);
    font-weight: 400;
    line-height: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The value and its control on one line, in the box of the field; blue
     while typing. A checkbox has its own box instead. */
  .value {
    grid-column: 2;
    grid-row: -2;
    box-sizing: border-box;
    height: 22px;
    display: grid;
    grid-template: 20px / minmax(0, 1fr);
    align-items: center;
    min-width: 0;
    padding: 0 6px;
    background: var(--se-panel);
    border: var(--se-hair);
    border-radius: var(--se-radius);
    transition: background-color var(--se-move);
  }
  .value > * { grid-area: 1 / 1; }

  /* .f .v */
  .ctrl,
  .shown {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: 20px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--se-ink);
    font-family: var(--se-font);
    font-size: var(--se-fs-lg);
    font-weight: 600;
    line-height: 20px;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
  }
  .shown {
    display: block;
    white-space: nowrap;
    overflow: hidden;
  }

  /* The chosen symbol on the left, beside label and value. */
  .symbol {
    grid-column: 1;
    grid-row: 1 / -1;
    align-self: center;
    display: grid;
    margin-right: 10px;
    color: var(--se-faint);
  }
  .symbol .icon { width: 18px; height: 18px; }

  /* How the field is filled in, on the right; a click goes through to the
     control below. */
  .sign {
    grid-column: 3;
    grid-row: 1 / -1;
    align-self: center;
    display: grid;
    margin-left: 8px;
    color: var(--se-faint);
    pointer-events: none;
  }
  .sign .icon { width: 16px; height: 16px; }

  /* A select lies invisible over the whole field. */
  select.ctrl {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    appearance: none;
  }

  input[type='number'] { appearance: textfield; }
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button { appearance: none; margin: 0; }

  /* The browser's own picker of a date or a time lies invisible over the sign
     on the right; the rest of the field takes the typing. */
  input::-webkit-datetime-edit,
  input::-webkit-datetime-edit-fields-wrapper,
  input::-webkit-datetime-edit-text,
  input::-webkit-datetime-edit-day-field,
  input::-webkit-datetime-edit-month-field,
  input::-webkit-datetime-edit-year-field,
  input::-webkit-datetime-edit-hour-field,
  input::-webkit-datetime-edit-minute-field { padding: 0; }
  input::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    right: 0;
    width: 40px;
    height: 100%;
    margin: 0;
    padding: 0;
    opacity: 0;
    cursor: pointer;
  }

  /* An empty date stays empty instead of showing the browser's date pattern;
     while it is typed into, the pattern stands. */
  .value.empty input[type='date']:not(:focus)::-webkit-datetime-edit,
  .value.empty input[type='time']:not(:focus)::-webkit-datetime-edit { opacity: 0; }

  /* The lookup: its magnifier is a button on the right, its hits hang under
     the whole field. */
  .field.lookup { padding-right: 40px; }
  .field .lookup { position: static; min-width: 0; }
  :host([data-ff-list]) { position: relative; z-index: 5; }

  .magnifier {
    position: absolute;
    top: 50%;
    right: 5px;
    width: 30px;
    height: 30px;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--se-radius-sm);
    background: none;
    color: var(--se-faint);
    cursor: pointer;
    transition: background-color var(--se-move), color var(--se-move);
  }
  .magnifier:hover { background: var(--se-hover-strong); color: var(--se-ink); }
  .magnifier:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
  .magnifier svg { width: 16px; height: 16px; }

  /* The checkbox: .f.check, the box (tickBoxStyle) and its text in the
     middle of the field. */
  .field.check {
    display: flex;
    align-items: center;
    padding: 0 10px;
    cursor: default;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .text {
    min-width: 0;
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 600;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :host(:not([preview])) .text { cursor: pointer; user-select: none; }

  /* In the editor the controls take no clicks; the magnifier still opens the
     lookup window, the label takes the double click that renames it. */
  :host([preview]) .field { cursor: default; }
  :host([preview]) .ctrl { pointer-events: none; }
`
