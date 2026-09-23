import { css } from 'lit'

export const tableStyle = css`
      :host { min-width: 0; height: 100%; }

      .table {
        --se-zell-x: 10px;
        --se-eingabe-x: 4px;

        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-r-lg);
        box-shadow: var(--se-schatten);
        overflow: hidden;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        color: var(--se-ink);
      }

      .search-row {
        padding: 5px 8px;
        border-bottom: var(--se-border) solid var(--se-line);
        background: var(--se-panel-2);
      }
      .search-row input {
        box-sizing: border-box;

        width: 100%;
        max-width: 15rem;
        height: 24px;
        padding: 0 8px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        color: var(--se-ink);
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-r-sm);
      }
      .search-row input:focus {
        outline: none;
        border-color: var(--se-accent);
      }

      /* Der Kopf ist eine Zeile hoch und waechst nur, wenn ein Titel umbricht. */
      .head {
        display: grid;
        min-height: var(--zeilen-hoehe);
        box-sizing: border-box;
      }
      .row {
        display: grid;
        height: var(--zeilen-hoehe);
        box-sizing: border-box;
      }

      .head {
        position: sticky;
        top: 0;
        z-index: 1;
        flex: none;
        background: var(--se-panel-2);
        border-bottom: var(--se-border) solid var(--se-line);
        font-size: var(--se-fs-kopf);
        font-weight: 600;
        color: var(--se-muted);
      }

      .body {
        flex: 1 1 auto;
        overflow: auto;

        /* Kein Gutter: reservierter Platz stuende bei kurzen Listen als Luecke
           neben der letzten Spalte. */
        scrollbar-width: thin;
        display: flex;
        flex-direction: column;
      }

      .body > .row { flex: none; }

      .ruler {
        flex: 1 1 auto;
        min-height: 0;

        background-image:
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--zeilen-hoehe) - 1px),
            var(--se-line-soft) calc(var(--zeilen-hoehe) - 1px),
            var(--se-line-soft) var(--zeilen-hoehe)
          );
        background-position: 0 0;

        display: grid;
      }

      .row {
        border-bottom: 1px solid var(--se-line-soft);
        background: var(--se-panel);
        transition: background-color var(--se-move);
      }

      /* Getoent wird nach der Nummer in der Ansicht, nicht per nth-child: ohne
         Kopfzeile oder mit vorangestellter Erfassungszeile kippte die Toenung. */
      .row.zebra {
        background: var(--se-zebra);
      }

      /* Nur eine Zeile OHNE Status faerbt sich unter der Maus: die Kennfarbe
         IST die Auskunft. */
      .body > .row:not([data-status]):hover {
        background: var(--se-hover);
      }

      .body > .row.selectable { cursor: pointer; }

      .body:focus { outline: none; }
      .body > .row:focus {
        outline: var(--se-border) solid var(--se-accent);
        outline-offset: calc(-1 * var(--se-border));
      }
      .body > .row:focus:not(:focus-visible) { outline: none; }

      .row.selected,
      .row:focus-visible,
      .body > .row.selected:not([data-status]):hover,
      .body > .row:not([data-status]):focus-visible:hover {
        background: var(--se-auswahl);
        box-shadow: inset 3px 0 0 var(--se-accent);
      }
      .row.selected > div,
      .row:focus-visible > div { color: var(--se-ink); }
      /* Die Textkante jeder Zelle; eine Zelle mit Eingabefeld gibt ihr Polster
         an das Feld ab (.typable). */
      .head > div,
      .row > div {
        padding: 0 var(--se-zell-x);
        line-height: calc(var(--zeilen-hoehe) - 1px);
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .row > div.number {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .head > div.number { justify-content: flex-end; text-align: right; }

      /* Zwei Titelzeilen passen genau in einen Takt: die Seitenrechnung zaehlt
         den Kopf als eine Zeile, jeder Pixel darueber rollte den Koerper. */
      .head > div {
        display: flex;
        align-items: center;
        line-height: calc((var(--takt) - var(--se-border)) / 2);
        white-space: normal;
        cursor: pointer;
        user-select: none;

        position: relative;
      }
      .head-text {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        overflow-wrap: break-word;
        -webkit-hyphens: auto;
        hyphens: auto;
      }

      /* Der Greifstreifen ist ein eigenes Gitter-Kind in der Spur der Kopfzelle
         und haengt ueber die Linie: eine 1px-Linie trifft die Maus nicht. In der
         Kopfzelle schnitte deren overflow ihn ab. */
      .width-handle {
        position: relative;
        z-index: 2;
        justify-self: end;
        width: 11px;
        margin-right: -5px;
        cursor: col-resize;

        /* Sonst rollt der Finger die Tabelle, statt zu ziehen. */
        touch-action: none;
      }
      .width-handle:hover {
        background: linear-gradient(
          to right,
          transparent 4px,
          var(--se-accent) 4px,
          var(--se-accent) 7px,
          transparent 7px
        );
      }

      .sort-arrow { font-size: 9px; color: var(--se-muted); }

      /* Nur im Editor: gedaempft, aber voll bedienbar — es ist eine echte Spalte. */
      :host([data-ff-editor]) .hidden { opacity: 0.45; }

      /* Das Wahlfenster liegt IN der Tabelle: die schneidet ihren Ueberhang ab. */
      .picker-backdrop {
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 4;
      }
      .column-picker {
        position: absolute;
        z-index: 5;
        display: flex;
        flex-direction: column;
        min-width: 160px;
        max-width: 260px;
        max-height: 70%;
        overflow-y: auto;
        padding: 3px;
        background: var(--se-panel);
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-r-md);
        box-shadow: var(--se-schatten);
      }
      .picker-title {
        margin: 0;
        padding: 3px 8px 5px;
        font-size: var(--se-fs-sm);
        font-weight: 600;
        color: var(--se-muted);
      }
      .picker-row,
      .picker-all {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 4px 8px;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        text-align: left;
        color: var(--se-ink);
        background: none;
        border: 0;
        border-radius: var(--se-r-sm);
        cursor: pointer;
      }
      .picker-row:hover:not(:disabled),
      .picker-all:hover { background: var(--se-hover); }
      .picker-row:disabled { cursor: default; opacity: 0.55; }
      .picker-row:not(.checked) { color: var(--se-muted); }
      .picker-check {
        flex: none;
        width: 12px;
        color: var(--se-accent);
      }
      .picker-all {
        margin-top: 3px;
        padding-top: 6px;
        border-top: var(--se-border) solid var(--se-line);
        color: var(--se-accent);
      }

      .row > div { color: var(--se-ink); }

      .foot {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 30px;
        padding: 3px 10px;
        border-top: var(--se-border) solid var(--se-line);
        font-size: var(--se-fs-sm);
        color: var(--se-muted);
        white-space: nowrap;
        overflow: hidden;
      }
      .foot--quiet {
        min-height: 0;
        height: 6px;
        padding: 0;
      }
      .page-info { flex: none; }
      .foot-right {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .page-nav {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      mark {
        padding: 0 1px;
        color: inherit;
        background: var(--se-amber-soft);
        border-radius: 2px;
      }

      .totals {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }
      .total-title { color: var(--se-muted); }
      .totals b {
        color: var(--se-ink);
        font-variant-numeric: tabular-nums;
      }

      .page-nav button {
        box-sizing: border-box;
        height: 22px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        padding: 2px 6px;
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-r-sm);
        background: var(--se-panel);
        color: var(--se-ink);
        cursor: pointer;
      }
      .page-nav button:disabled {
        opacity: 0.3;
        cursor: default;
      }
`
