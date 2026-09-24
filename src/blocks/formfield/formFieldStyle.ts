import { css } from 'lit'

export const fieldStyle = css`
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    font-family: var(--se-font);
  }

  .label {
    flex: none;
    color: var(--se-muted);
    font-size: var(--se-fs-head);
    font-weight: 600;
    line-height: var(--se-lh);
    letter-spacing: .04em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wrap { position: relative; }

  .ctrl {
    box-sizing: border-box;
    width: 100%;
    padding: 7px 10px;
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
    padding: 5px 8px;
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

  /* An empty date stays empty instead of showing the browser's date pattern. */
  .wrap.empty input[type="date"]:not(:focus)::-webkit-datetime-edit,
  .wrap.empty input[type="time"]:not(:focus)::-webkit-datetime-edit { opacity: 0; }

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
     its inspector section. */
  :host([preview]) .ctrl { pointer-events: none; }
  :host([preview]) .wrap[data-ff-bound] .ctrl {
    border-style: dotted;
    border-color: var(--se-accent);
  }

  :host(:not([preview])) .row .text { cursor: pointer; user-select: none; }

  :host([fills]) .field { height: 100%; }
  :host([fills]) .wrap { flex: 1 1 auto; min-height: 0; }
  :host([fills]) .lookup { height: 100%; }
  :host([fills]) .wrap .ctrl { height: 100%; min-height: 0; }
`
