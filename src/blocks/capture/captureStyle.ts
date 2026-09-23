import { css } from 'lit'

export const captureStyle = css`
      /* Traeger fuer das Suchfenster-Fenster im Editor: es liegt ueber dem
         ganzen Baustein. */
      :host { position: relative; }

      /* Die Erfassungszeile klebt bedingungslos unten, nicht nur bei
         „Blaettern = Nein": sonst tippte der Bediener ins Unsichtbare. */
      .body > .row.capture {
        position: sticky;
        bottom: 0;
        z-index: 1;
      }

      /* Eine Zeile wie jede andere: dieselbe Flaeche, dieselbe Schrift. Nur die
         Linie darueber trennt sie vom Gerollten, wie die Linie unter dem Kopf. */
      .row.capture {
        flex: none;
        background: var(--se-panel);
        border-top: var(--se-border) solid var(--se-line);
      }

      /* Im Editor stehen die Spaltentitel dort, wo in der Maske die Platzhalter
         stehen, in derselben Farbe. */
      :host([data-ff-editor]) .row.capture > div { color: var(--se-faint); }

      .row.captured { flex: none; }
      :host(:not([data-ff-editor])) .row.captured { cursor: pointer; }

      /* Platz vor der ersten Zelle fuer den Statuspunkt. */
      .head > div:first-of-type,
      .row > div:first-of-type { padding-left: calc(var(--se-zell-x) + 14px); }

      /* Traeger fuer Statuspunkt und Kreuz. */
      .row { position: relative; }
      .row[data-status]::before {
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

      .row.deleted > div { text-decoration: line-through; color: var(--se-muted); }

      /* Der Zeilen-Status ist der Punkt vor der ersten Zelle. */
      .row[data-status="captured"] { background: var(--se-accent-soft); }
      .row[data-status="captured"]::before,
      .row[data-status="writes"]::before { background: var(--se-accent); }
      .row[data-status="changed"]::before,
      .row[data-status="deletion"]::before { background: var(--se-amber); }
      .row[data-status="deletion"] { background: var(--se-red-shell); }
      .row[data-status="writes"] { animation: se-writing 1.1s ease-in-out infinite; }
      .row[data-status="written"] { color: var(--se-muted); }
      .row[data-status="error"] { background: var(--se-red-shell); }
      .row[data-status="error"]::before { background: var(--se-red); }
      @keyframes se-writing { 50% { opacity: 0.55; } }
      @media (prefers-reduced-motion: reduce) {
        .row[data-status="writes"] { animation: none; }
      }

      /* Das Kreuz am rechten Rand der Zeile: absolut, sonst schoebe es den
         Wert der letzten Zelle beiseite. */
      .row-remove {
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
      .row:hover .row-remove,
      .row.deleted .row-remove,
      .row-remove:focus { opacity: 1; }
      .row-remove:hover { color: var(--se-red); background: var(--se-red-soft); }

      .row-remove.row-remove-static { opacity: 1; cursor: default; }

      /* Eine tippbare Zelle bleibt eine ZELLE, kein Formularfeld: sechs davon in
         einer Zeile flackerten sonst beim Ueberfahren. Die Zelle gibt ihr
         Polster an das Feld ab, zusammen ergeben sie wieder --se-zell-x, und
         sie laesst die Vorschlagsliste heraushaengen. */
      .row > div.typable,
      .row.capture > div {
        display: flex;
        align-items: center;
        overflow: visible;
        padding: 0 calc(var(--se-zell-x) - var(--se-eingabe-x) - var(--se-border));
      }
      .row > div.typable:first-of-type,
      .row.capture > div:first-of-type {
        padding-left: calc(var(--se-zell-x) + 14px - var(--se-eingabe-x) - var(--se-border));
      }
`
