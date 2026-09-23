// Das Aussehen der Tafel, abgelesen an der Empfangsmaske (docs/chef-maske/empfang).
import { css } from 'lit'

export const tafelStil = css`
  :host { min-width: 0; height: 100%; display: flex; flex-direction: column; font-family: var(--se-font); color: var(--se-ink); }

  .meldung:empty { display: none; }
  .meldung {
    flex: none;
    margin: 0 0 8px;
    font-size: var(--se-fs-sm);
    color: var(--se-muted);
  }

  .bedienung {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: var(--se-fs-sm);
  }

  select {
    font: inherit;
    max-width: 100%;
    padding: 5px 8px;
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-r-sm);
    color: var(--se-ink);
    background: var(--se-panel);
  }

  .tafel {
    display: flex;
    align-items: stretch;
    gap: var(--se-gap-lg);
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .spalte {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 150px;
    min-height: 0;
    overflow: hidden;
    background: var(--fw-schale);
    border: 1.5px solid var(--fw-rand);
    border-radius: var(--se-r-lg);
  }
  .spalte.versteckt, .platz.versteckt { opacity: 0.5; border-style: dashed; }
  /* Nur der Editor zeigt die ausgeblendete Spalte; sie soll den anderen den
     Platz nicht wegnehmen, sonst faellt die letzte sichtbare aus dem Rahmen. */
  .spalte.versteckt { flex: 0 0 150px; }

  .spaltenkopf {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    min-height: 56px;
    padding: 11px 12px;
    background: var(--fw-sanft);
    border-bottom: var(--se-border) solid var(--fw-rand);
  }

  .punkt {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--fw-stark);
  }

  /* Zwei Zeilen statt „Termine he…“: in einer schmalen Spalte muss die
     Ueberschrift lesbar bleiben. */
  .titel {
    min-width: 0;
    color: var(--fw-schrift);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .anzahl,
  .platzzahl {
    flex: none;
    margin-left: auto;
    min-width: 22px;
    padding: 1px 8px;
    box-sizing: border-box;
    border-radius: var(--se-r-sm);
    background: var(--se-panel);
    border: var(--se-border) solid var(--fw-rand);
    text-align: center;
    font-family: var(--se-mono);
    font-size: var(--se-fs-sm);
    color: var(--fw-schrift);
  }

  .rumpf {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1 1 auto;
    min-height: 0;
    padding: 11px;
    overflow-y: auto;
  }
  /* Die Spalte rollt, ihr Inhalt schrumpft nicht: sonst schneidet sie Karten ab. */
  .rumpf > *, .platzrumpf > * { flex: none; }

  .platz {
    border: 1.5px solid var(--fw-rand);
    border-radius: var(--se-r-sm);
    background: var(--se-panel);
    overflow: hidden;
  }

  .platzkopf {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--fw-sanft);
    color: var(--fw-schrift);
    font-size: 13px;
    font-weight: 600;
  }
  .platzkopf span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .platzzahl { border: none; background: none; padding: 0; }

  .platzrumpf { display: flex; flex-direction: column; gap: 8px; padding: 10px; }

  .frei {
    padding: 8px 12px;
    color: var(--se-faint);
    font-size: var(--se-fs-sm);
    text-align: center;
  }

  .leer { border: 1.5px dashed var(--se-line); border-radius: var(--se-r-sm); color: var(--se-faint); }

  .ablage.ziel {
    outline: 2px dashed var(--fw-stark, var(--se-accent));
    outline-offset: -2px;
  }

  .karte {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: var(--se-card-bg);
    border: var(--se-border) solid var(--se-card-line);
    border-radius: var(--se-r-sm);
    transition: border-color var(--se-move);
  }
  .karte[role='button'] { cursor: grab; }
  .karte:hover { border-color: var(--se-faint); }
  .karte:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 1px; }
  .karte.hervor { border-color: var(--se-red-line); }
  .karte.gewaehlt { border-color: var(--se-accent); background: var(--se-accent-soft); }
  .karte.zieht { opacity: 0.55; }

  .haupt { display: flex; gap: 11px; align-items: flex-start; min-width: 0; }
  .ident { flex: 1; min-width: 0; }
  .zeile1 { display: flex; align-items: baseline; gap: 7px; min-width: 0; }

  .bild {
    box-sizing: border-box;
    flex: none;
    width: 36px;
    height: 36px;
    overflow: hidden;
    border-radius: var(--se-r-sm);
    display: grid;
    place-items: center;
  }
  .bild:empty { border: var(--se-border) dashed var(--se-faint); border-radius: 50%; }
  .bild img { width: 100%; height: 100%; display: block; object-fit: cover; }
  .bild.tier svg { width: 88%; height: 88%; }

  .name,
  .zusatz,
  .unterzeile {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name { font-size: var(--se-fs-lg); font-weight: 600; min-width: 0; }
  .zusatz { flex: none; max-width: 45%; font-size: var(--se-fs-sm); color: var(--se-muted); }
  .unterzeile { display: block; font-size: var(--se-fs-sm); color: var(--se-muted); }

  .zeit {
    flex: none;
    font-size: var(--se-fs-sm);
    color: var(--se-faint);
    font-family: var(--se-mono);
    font-variant-numeric: tabular-nums;
  }

  .marken { display: flex; flex-wrap: wrap; gap: 5px; }
  .marke {
    font-size: var(--se-fs-xs);
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--se-r-sm);
    background: var(--fw-sanft);
    color: var(--fw-schrift);
  }

  .grund {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.35;
    color: var(--se-ink);
  }

  .fuss {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--se-fs-sm);
    color: var(--se-muted);
  }

  .datum { flex: none; font-variant-numeric: tabular-nums; white-space: nowrap; }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    margin-left: auto;
    padding: 2px 8px;
    border-radius: var(--se-r-sm);
    font-size: var(--se-fs-xs);
    font-weight: 600;
    color: var(--fw-schrift);
    background: var(--fw-sanft);
    white-space: nowrap;
  }

  .weiter {
    height: 28px;
    border: none;
    border-radius: var(--se-r-lg);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: var(--fw-sanft);
    color: var(--fw-schrift);
  }
  .weiter:hover:not(:disabled) { filter: brightness(0.96); }
  .weiter:disabled { cursor: default; }
  :host(:not([data-ff-editor])) .weiter:disabled { opacity: 0.5; }
`
