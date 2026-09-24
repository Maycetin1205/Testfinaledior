import { css } from 'lit'

export const fieldStyle = css`
  .field {
    font-family: var(--se-font);

    --field-pad-y: 7px;
    --field-pad-x: 10px;
    --field-border: var(--se-border);
  }

  .wrap { position: relative; }

  .ctrl {
    box-sizing: border-box;
    width: 100%;
    padding: var(--field-pad-y) var(--field-pad-x);
    border: var(--field-border) solid var(--se-line);
    background: var(--se-panel);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);

    line-height: 1.4;
    color: var(--se-ink);
  }
  .ctrl:focus {
    outline: none;
    border-color: var(--se-accent);
    box-shadow: var(--se-focus);
  }
  textarea.ctrl {
    display: block;
    resize: vertical;
    min-height: 64px;
  }
  select.ctrl { padding: calc(var(--field-pad-y) - 1px) calc(var(--field-pad-x) - 2px); }

  .field.line .ctrl,
  :host([preview]) .field.line .ctrl,
  :host([preview]) .field.line .wrap[data-ff-bound] .ctrl,
  :host([preview]) .field.line .lookup .ctrl {
    border: none !important;
    border-bottom: 1.5px solid var(--se-line) !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding-left: 2px;
    padding-right: 2px;
    box-shadow: none !important;
    outline: none !important;
  }
  .field.line .ctrl:focus {
    outline: none !important;
    border-bottom-color: var(--se-accent) !important;
    box-shadow: none !important;
  }
  .field.line [data-ff-bound] {
    text-decoration: none !important;
  }
  .field.line .ph {
    left: 2px;
    right: 2px;
  }

  .ph {
    position: absolute;
    top: calc(var(--field-pad-y) + var(--field-border));
    left: calc(var(--field-pad-x) + var(--field-border));
    right: calc(var(--field-pad-x) + var(--field-border));
    color: var(--se-faint);
    font-size: var(--se-fs);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
  .ph[hidden] { display: none; }

  .ph-select {
    top: calc(var(--field-pad-y) - 1px + var(--field-border));
    left: calc(var(--field-pad-x) - 2px + var(--field-border));
    right: 25px;
  }

  /* The placeholder leaves the magnifier free: in the editor it takes clicks
     and would cover it. */
  .ph-lookup { right: 34px; }

  .wrap.empty input[type="date"]:not(:focus)::-webkit-datetime-edit,
  .wrap.empty input[type="time"]:not(:focus)::-webkit-datetime-edit { opacity: 0; }
  .wrap.empty.typing .ph-native { display: none; }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--se-fs);
    color: var(--se-ink);
  }
  input[type='checkbox'].ctrl {
    width: 15px;
    height: 15px;
    padding: 0;
    flex: none;
    accent-color: var(--se-accent);
  }

  .lookup { position: relative; }
  .lookup .ctrl { padding-right: 34px; border-style: dashed; }

  /* The open suggestion list hangs out of the field. Grid children stack in
     document order, so without this it would lie under the next block. */
  :host([data-ff-list]) { position: relative; z-index: 5; }

  .magnifier {
    position: absolute;
    top: var(--field-border);
    bottom: var(--field-border);
    right: var(--field-border);
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

  :host([preview]) .ctrl { pointer-events: none; }
  /* The magnifier stays clickable in the editor: it opens the lookup window and
     its inspector section. */
  :host([preview]) .ph { pointer-events: auto; cursor: text; }
  :host([preview]) .field:not(.line) .wrap[data-ff-bound] .ctrl {
    border-style: dotted;
    border-color: var(--se-accent);
  }

  :host([preview]) [data-ff-editable]:empty::before { content: 'Text …'; opacity: 0.6; }

  :host(:not([preview])) .row .text { cursor: pointer; user-select: none; }

  :host([fills]) .field,
  :host([fills]) .wrap { height: 100%; }
  :host([fills]) .wrap .ctrl { height: 100%; }
`
