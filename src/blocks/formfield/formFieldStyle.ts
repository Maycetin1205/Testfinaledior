import { css } from 'lit'

export const fieldStyle = css`
  /* Padding of .vinput, plain of .kinput; the label in the empty field
     starts where the text does. */
  .field {
    --field-pad-y: 7px;
    --field-pad-x: 10px;

    font-family: var(--se-font);
  }
  .field.plain {
    --field-pad-y: 5px;
    --field-pad-x: 8px;
  }

  /* The label lies on the control, on the line of its text: the control
     places its text itself, at every height. */
  .wrap {
    display: grid;
    grid-template: 100% / 100%;
    align-items: baseline;
  }
  .wrap > * { grid-area: 1 / 1; }

  .ctrl {
    box-sizing: border-box;
    width: 100%;
    padding: var(--field-pad-y) var(--field-pad-x);
    border: var(--se-border) solid var(--se-line);
    background: var(--se-panel);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    line-height: var(--se-lh);
    color: var(--se-ink);
    transition: border-color var(--se-move), box-shadow var(--se-move);
  }
  .ctrl:focus {
    outline: none;
    border-color: var(--se-accent);
    box-shadow: var(--se-focus);
  }
  textarea.ctrl {
    display: block;
    resize: vertical;
    min-height: 50px;
  }

  /* The plain look is the inline field of the record card. */
  .field.plain .ctrl {
    border-color: transparent;
    background: transparent;
    transition: background var(--se-move), border-color var(--se-move);
  }
  .field.plain .ctrl:hover { background: var(--se-hover); }
  .field.plain .ctrl:focus {
    background: var(--se-panel);
    border-color: var(--se-accent);
    box-shadow: var(--se-focus);
  }
  .field.plain textarea.ctrl,
  .field.plain textarea.ctrl:hover {
    min-height: 66px;
    border-color: var(--se-line);
    background: var(--se-panel);
  }

  /* The label in the empty field, in the color of input::placeholder.
     Positioned, as the holder of the lookup is, which would paint over it
     otherwise; empty, it keeps its line for the double click. */
  .ph {
    position: relative;
    min-width: 0;
    min-height: calc(1em * var(--se-lh));
    margin: 0 calc(var(--field-pad-x) + var(--se-border));
    color: var(--se-muted);
    font-size: var(--se-fs);
    line-height: var(--se-lh);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
  /* A select draws its text 4px inside its padding and keeps its end for the
     arrow. */
  select.ctrl ~ .ph {
    margin-left: calc(var(--field-pad-x) + var(--se-border) + 4px);
    margin-right: calc(var(--field-pad-x) + var(--se-border) + 16px);
  }

  /* An empty date stays empty instead of showing the browser's date pattern;
     while it is typed into, the pattern stands instead of the label. */
  .wrap.empty input[type="date"]:not(:focus)::-webkit-datetime-edit,
  .wrap.empty input[type="time"]:not(:focus)::-webkit-datetime-edit { opacity: 0; }
  input[type="date"]:focus ~ .ph,
  input[type="time"]:focus ~ .ph { display: none; }

  .row {
    display: flex;
    align-items: center;
    gap: var(--se-gap);
    font-size: var(--se-fs);
    font-weight: 500;
    color: var(--se-ink);
  }
  input[type='checkbox'].ctrl {
    width: 16px;
    height: 16px;
    padding: 0;
    flex: none;
    accent-color: var(--se-accent);
  }

  .lookup { position: relative; }
  .field .lookup .ctrl { padding-right: 38px; }
  /* The label leaves the magnifier free: in the editor it takes clicks and
     would cover it. */
  .lookup ~ .ph { margin-right: calc(38px + var(--se-border)); }

  /* The open suggestion list hangs out of the field. Grid children stack in
     document order, so without this it would lie under the next block. */
  :host([data-ff-list]) { position: relative; z-index: 5; }

  .magnifier {
    position: absolute;
    top: var(--se-border);
    bottom: var(--se-border);
    right: var(--se-border);
    width: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--se-muted);
    cursor: pointer;
    transition: background var(--se-move);
  }
  .magnifier:hover { background: var(--se-accent-soft); color: var(--se-ink); }
  .magnifier:focus-visible { outline: 2px solid var(--se-accent); outline-offset: -2px; }

  /* The magnifier stays clickable in the editor: it opens the lookup window and
     its inspector section. The label takes the double click that renames it. */
  :host([preview]) .ctrl { pointer-events: none; }
  :host([preview]) .ph { pointer-events: auto; }
  :host([preview]) .wrap[data-ff-bound] .ctrl {
    border-style: dotted;
    border-color: var(--se-accent);
  }

  :host(:not([preview])) .row .text { cursor: pointer; user-select: none; }

  :host([fills]) .field,
  :host([fills]) .wrap,
  :host([fills]) .lookup { height: 100%; }
  :host([fills]) .wrap .ctrl { height: 100%; min-height: 0; }
`
