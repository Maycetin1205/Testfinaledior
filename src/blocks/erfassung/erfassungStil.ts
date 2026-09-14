// Das Aussehen der Erfassung: Tipp-Zeile, erfasste Zeilen, Statuspunkt, Kreuz, Tippzelle.
import { css } from 'lit'

export const erfassungStil = css`
      /* Traeger fuer das Suchfenster-Fenster im Editor: es liegt ueber dem
         ganzen Baustein. */
      :host { position: relative; }

      /* Die Erfassungszeile klebt bedingungslos unten, nicht nur bei
         „Blaettern = Nein": sonst tippte der Bediener ins Unsichtbare. */
      .koerper > .zeile.erfassung {
        position: sticky;
        bottom: 0;
        z-index: 1;
      }

      .zeile.erfassung {
        flex: none;
        background: var(--se-panel-2);
        border-top: var(--se-border) solid var(--se-line);
      }

      :host([data-ff-editor]) .zeile.erfassung > div { color: var(--se-muted); }

      .zeile.erfasst { flex: none; }
      :host(:not([data-ff-editor])) .zeile.erfasst { cursor: pointer; }

      /* Platz vor der ersten Zelle fuer den Statuspunkt. */
      .kopf > div:first-of-type,
      .zeile > div:first-of-type { padding-left: calc(var(--se-zell-x) + 14px); }

      /* Traeger fuer Statuspunkt und Kreuz. */
      .zeile { position: relative; }
      .zeile[data-status]::before {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--se-faint);
        pointer-events: none;
      }
      /* Der Rechen-Hinweis steht UEBER der Zeile, damit er in der Gitterzeile
         keine Zelle beansprucht und mit der klebenden Zeile mitwandert. */
      .rechen-hinweis {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 100%;
        padding: 2px var(--se-zell-x);
        background: var(--se-amber-soft, var(--se-panel-2));
        color: var(--se-amber, var(--se-muted));
        border-top: var(--se-border) solid var(--se-line);
        font-size: var(--se-fs-sm);
        pointer-events: none;
      }

      .fehltext {
        margin-left: 8px;
        font-size: var(--se-fs-sm);
        color: var(--se-red);
      }

      .zeile.geloescht > div { text-decoration: line-through; color: var(--se-muted); }

      /* Der Zeilen-Status ist der Punkt vor der ersten Zelle; der Klartext
         haengt im title. */
      .zeile[data-status="erfasst"] { background: var(--se-accent-soft); }
      .zeile[data-status="erfasst"]::before,
      .zeile[data-status="schreibt"]::before { background: var(--se-accent); }
      .zeile[data-status="geaendert"]::before,
      .zeile[data-status="loeschung"]::before { background: var(--se-amber); }
      .zeile[data-status="loeschung"] { background: var(--se-red-shell); }
      .zeile[data-status="schreibt"] { animation: se-schreibt 1.1s ease-in-out infinite; }
      .zeile[data-status="geschrieben"] { color: var(--se-muted); }
      .zeile[data-status="fehler"] { background: var(--se-red-shell); }
      .zeile[data-status="fehler"]::before { background: var(--se-red); }
      @keyframes se-schreibt { 50% { opacity: 0.55; } }
      @media (prefers-reduced-motion: reduce) {
        .zeile[data-status="schreibt"] { animation: none; }
      }

      /* Das Kreuz am rechten Rand der Zeile: absolut, sonst schoebe es den
         Wert der letzten Zelle beiseite. */
      .zeile-weg {
        position: absolute;
        right: 2px;
        top: 50%;
        transform: translateY(-50%);
        padding: 0 4px;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        line-height: 1;
        color: var(--se-faint);
        background: var(--se-panel);
        border: 0;
        border-radius: var(--se-r-sm);
        cursor: pointer;
        opacity: 0;
      }
      .zeile:hover .zeile-weg,
      .zeile.geloescht .zeile-weg,
      .zeile-weg:focus { opacity: 1; }
      .zeile-weg:hover { color: var(--se-red); background: var(--se-red-soft); }

      .zeile-weg.zeile-weg-anzeige { opacity: 1; cursor: default; }

      /* Eine tippbare Zelle bleibt eine ZELLE, kein Formularfeld: sechs davon in
         einer Zeile flackerten sonst beim Ueberfahren. Die Zelle gibt ihr
         Polster an das Feld ab, zusammen ergeben sie wieder --se-zell-x, und
         sie laesst die Vorschlagsliste heraushaengen. */
      .zeile > div.tippbar,
      .zeile.erfassung > div {
        display: flex;
        align-items: center;
        overflow: visible;
        padding: 0 calc(var(--se-zell-x) - var(--se-eingabe-x) - var(--se-border));
      }
      .zeile > div.tippbar:first-of-type,
      .zeile.erfassung > div:first-of-type {
        padding-left: calc(var(--se-zell-x) + 14px - var(--se-eingabe-x) - var(--se-border));
      }
`
