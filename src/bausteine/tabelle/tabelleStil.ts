// Das Aussehen der Tabelle.
import { css } from 'lit'

export const tabelleStil = css`
      :host { min-width: 0; height: 100%; }

      .tabelle {
        --se-zell-x: 10px;
        --se-eingabe-x: 4px;

        --kopf-hoehe: 36px;

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

      .suchzeile {
        padding: 5px 8px;
        border-bottom: var(--se-border) solid var(--se-line);
        background: var(--se-panel-2);
      }
      .suchzeile input {
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
      .suchzeile input:focus {
        outline: none;
        border-color: var(--se-accent);
      }

      .kopf {
        display: grid;
        height: var(--kopf-hoehe);
        box-sizing: border-box;
      }
      .zeile {
        display: grid;
        height: var(--zeilen-hoehe);
        box-sizing: border-box;
      }

      .kopf {
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

      .koerper {
        flex: 1 1 auto;
        overflow: auto;

        /* Kein Gutter: reservierter Platz stuende bei kurzen Listen als Luecke
           neben der letzten Spalte. */
        scrollbar-width: thin;
        display: flex;
        flex-direction: column;
      }

      .koerper > .zeile { flex: none; }

      .lineal {
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

      .koerper > .leer--tafel {
        flex: 1 1 auto;
        align-content: center;
      }
      .zeile {
        border-bottom: 1px solid var(--se-line-soft);
        background: var(--se-panel);
        transition: background-color var(--se-move);
      }

      /* Getoent wird nach der Nummer in der Ansicht, nicht per nth-child: ohne
         Kopfzeile oder mit vorangestellter Erfassungszeile kippte die Toenung. */
      .zeile.zebra {
        background: var(--se-zebra);
      }

      /* Nur eine Zeile OHNE Status faerbt sich unter der Maus: die Kennfarbe
         IST die Auskunft. */
      .koerper > .zeile:not([data-status]):hover {
        background: var(--se-hover);
      }

      .koerper > .zeile.waehlbar { cursor: pointer; }

      .koerper:focus { outline: none; }
      .koerper > .zeile:focus {
        outline: var(--se-border) solid var(--se-accent);
        outline-offset: calc(-1 * var(--se-border));
      }
      .koerper > .zeile:focus:not(:focus-visible) { outline: none; }

      .zeile.gewaehlt,
      .zeile:focus-visible,
      .koerper > .zeile.gewaehlt:not([data-status]):hover,
      .koerper > .zeile:not([data-status]):focus-visible:hover {
        background: var(--se-auswahl);
        box-shadow: inset 3px 0 0 var(--se-accent);
      }
      .zeile.gewaehlt > div,
      .zeile:focus-visible > div { color: var(--se-ink); }
      /* Die Textkante jeder Zelle; eine Zelle mit Eingabefeld gibt ihr Polster
         an das Feld ab (.tippbar). */
      .kopf > div,
      .zeile > div {
        padding: 0 var(--se-zell-x);
        line-height: calc(var(--zeilen-hoehe) - 1px);
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .zeile > div.zahl {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .kopf > div.z { justify-content: flex-end; text-align: right; }

      .kopf > div {
        display: flex;
        align-items: center;
        line-height: 1.25;
        white-space: normal;
        cursor: pointer;
        user-select: none;

        position: relative;
      }
      .kopf-text {
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
      .breite-griff {
        position: relative;
        z-index: 2;
        justify-self: end;
        width: 11px;
        margin-right: -5px;
        cursor: col-resize;

        /* Sonst rollt der Finger die Tabelle, statt zu ziehen. */
        touch-action: none;
      }
      .breite-griff:hover {
        background: linear-gradient(
          to right,
          transparent 4px,
          var(--se-accent) 4px,
          var(--se-accent) 7px,
          transparent 7px
        );
      }

      .sort-pfeil { font-size: 9px; color: var(--se-muted); }

      /* Nur im Editor: gedaempft, aber voll bedienbar — es ist eine echte Spalte. */
      :host([data-ff-editor]) .versteckt { opacity: 0.45; }

      /* Das Wahlfenster liegt IN der Tabelle: die schneidet ihren Ueberhang ab. */
      .sw-schirm {
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 4;
      }
      .spaltenwahl {
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
      .sw-titel {
        margin: 0;
        padding: 3px 8px 5px;
        font-size: var(--se-fs-sm);
        font-weight: 600;
        color: var(--se-muted);
      }
      .sw-zeile,
      .sw-alle {
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
      .sw-zeile:hover:not(:disabled),
      .sw-alle:hover { background: var(--se-hover); }
      .sw-zeile:disabled { cursor: default; opacity: 0.55; }
      .sw-zeile:not(.an) { color: var(--se-muted); }
      .sw-haken {
        flex: none;
        width: 12px;
        color: var(--se-accent);
      }
      .sw-alle {
        margin-top: 3px;
        padding-top: 6px;
        border-top: var(--se-border) solid var(--se-line);
        color: var(--se-accent);
      }

      .zeile > div { color: var(--se-ink); }

      .fusszeile {
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
      .seiten-info { flex: none; }
      .fuss-rechts {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .seiten-nav {
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

      .summen {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }
      .summe-titel { color: var(--se-muted); }
      .summen b {
        color: var(--se-ink);
        font-variant-numeric: tabular-nums;
      }

      .seiten-nav button {
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
      .seiten-nav button:disabled {
        opacity: 0.3;
        cursor: default;
      }
`
