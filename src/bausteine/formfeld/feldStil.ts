// Das Aussehen des Formularfelds und seiner Platzhalter.
import { css } from 'lit'

export const feldStil = css`
  .feld {
    font-family: var(--se-font);

    --feld-pad-y: 7px;
    --feld-pad-x: 10px;
    --feld-rand: var(--se-border);
  }

  .huelle { position: relative; }

  .ctrl {
    box-sizing: border-box;
    width: 100%;
    padding: var(--feld-pad-y) var(--feld-pad-x);
    border: var(--feld-rand) solid var(--se-line);
    background: var(--se-panel);
    border-radius: var(--se-r-md);
    font-family: var(--se-font);
    font-size: var(--se-fs);

    line-height: 1.4;
    color: var(--se-ink);
  }
  .ctrl:focus {
    outline: none;
    border-color: var(--se-accent);
    box-shadow: 0 0 0 var(--se-border) var(--se-accent);
  }
  textarea.ctrl {
    display: block;
    resize: vertical;
    min-height: 64px;
  }
  select.ctrl { padding: calc(var(--feld-pad-y) - 1px) calc(var(--feld-pad-x) - 2px); }

  .feld.linie .ctrl,
  :host([data-ff-editor]) .feld.linie .ctrl,
  :host([data-ff-editor]) .feld.linie .huelle[data-ff-bound] .ctrl,
  :host([data-ff-editor]) .feld.linie .nachschlag .ctrl {
    border: none !important;
    border-bottom: 1.5px solid var(--se-line) !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding-left: 2px;
    padding-right: 2px;
    box-shadow: none !important;
    outline: none !important;
  }
  .feld.linie .ctrl:focus {
    outline: none !important;
    border-bottom-color: var(--se-accent) !important;
    box-shadow: none !important;
  }
  .feld.linie [data-ff-bound] {
    text-decoration: none !important;
  }
  .feld.linie .ph {
    left: 2px;
    right: 2px;
  }

  .ph {
    position: absolute;
    top: calc(var(--feld-pad-y) + var(--feld-rand));
    left: calc(var(--feld-pad-x) + var(--feld-rand));
    right: calc(var(--feld-pad-x) + var(--feld-rand));
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
    top: calc(var(--feld-pad-y) - 1px + var(--feld-rand));
    left: calc(var(--feld-pad-x) - 2px + var(--feld-rand));
    right: 25px;
  }

  /* Der Platzhalter laesst die Lupe frei: im Editor ist er klickbar und wuerde
     sie sonst fast ganz verdecken. */
  .ph-nachschlag { right: 34px; }

  .huelle.leer input[type="date"]:not(:focus)::-webkit-datetime-edit,
  .huelle.leer input[type="time"]:not(:focus)::-webkit-datetime-edit { opacity: 0; }
  .huelle.leer.tippt .ph-nativ { display: none; }

  .zeile {
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

  .nachschlag { position: relative; }
  .nachschlag .ctrl { padding-right: 34px; border-style: dashed; }

  /* Die offene Vorschlagsliste haengt unten aus dem Feld heraus; Raster-Kinder
     stapeln in DOM-Reihenfolge, ohne diesen Vorrang laege sie unter dem
     naechsten Baustein. */
  :host([data-ff-liste]) { position: relative; z-index: 5; }

  .lupe {
    position: absolute;
    top: var(--feld-rand);
    bottom: var(--feld-rand);
    right: var(--feld-rand);
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
  .lupe:hover { background: var(--se-accent-soft); color: var(--se-ink); }
  .lupe:focus-visible { outline: 2px solid var(--se-accent); outline-offset: -2px; }

  :host([data-ff-editor]) .ctrl { pointer-events: none; }
  /* Die Lupe bleibt im Editor bedienbar: ihr Klick macht das Suchfenster auf
     und im Inspector den Abschnitt „Suchfenster". */
  :host([data-ff-editor]) .ph { pointer-events: auto; cursor: text; }
  :host([data-ff-editor]) .feld:not(.linie) .huelle[data-ff-bound] .ctrl {
    border-style: dotted;
    border-color: var(--se-accent);
  }

  :host([data-ff-editor]) [data-ff-editable]:empty::before { content: 'Text …'; opacity: 0.6; }

  :host(:not([data-ff-editor])) .zeile .text { cursor: pointer; user-select: none; }

  :host([fuellt]) .feld,
  :host([fuellt]) .huelle { height: 100%; }
  :host([fuellt]) .huelle .ctrl { height: 100%; }
`
