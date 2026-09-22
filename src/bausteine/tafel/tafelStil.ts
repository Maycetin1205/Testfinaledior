// Das Aussehen der Tafel: Meldung, Zielwahl, Spalten, Unterteilungen und Karten.
import { css } from 'lit'

export const tafelStil = css`
  :host { min-width: 0; height: 100%; display: flex; flex-direction: column; font-family: var(--se-font); }

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
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  select {
    font: inherit;
    max-width: 100%;
    padding: 6px;
    border: 1px solid var(--se-muted);
    border-radius: var(--se-r-md);
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
  }

  .spalte {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 180px;
    min-height: 0;
    overflow: hidden;
    background: var(--fw-sanft);
    border-radius: var(--se-r-lg);
  }

  .spaltenkopf {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--se-gap-sm);
    padding: 10px 12px;
  }

  .punkt {
    flex: none;
    width: 8px;
    height: 8px;
    background: var(--fw-stark);
  }

  .titel {
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .anzahl {
    margin-left: auto;
    min-width: 22px;
    padding: 1px 8px;
    line-height: 1;
    border-radius: var(--se-r-sm);
    background: var(--se-panel);
    border: var(--se-border) solid var(--fw-stark);
    text-align: center;
    font-family: var(--se-mono);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--se-ink);
  }

  .rumpf {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 10px 12px;
    overflow-y: auto;
  }

  .unterteilung {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-radius: var(--se-r-md);
  }

  .unterkopf {
    padding: 2px 2px 0;
    font-size: var(--se-fs-sm);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--se-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .frei {
    padding: 10px;
    border: var(--se-border) dashed var(--se-line);
    border-radius: var(--se-r-md);
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    text-align: center;
  }

  .ablage.ziel {
    background: var(--se-accent-soft);
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }

  .karte {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 11px 13px 12px;
    background: var(--se-card-bg);
    border: var(--se-border) solid var(--se-card-line);
    border-radius: var(--se-r-md);
    transition: border-color var(--se-move);
  }
  .karte[role='button'] { cursor: pointer; }
  .karte:hover { border-color: var(--se-faint); }
  .karte:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 1px; }
  .karte.gewaehlt { border-color: var(--se-accent); background: var(--se-accent-soft); }
  .karte.zieht { opacity: 0.45; }

  .kopf { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .namen { min-width: 0; flex: 1; }

  .bild {
    box-sizing: border-box;
    flex: none;
    width: 36px;
    height: 36px;
    overflow: hidden;
    border-radius: 50%;
    background: var(--se-panel);
  }
  .bild:empty { border: var(--se-border) dashed var(--se-faint); }
  .bild img { width: 100%; height: 100%; display: block; object-fit: cover; }

  .name,
  .zusatz {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    color: var(--se-ink);
    font-size: var(--se-fs-lg);
    font-weight: 700;
    line-height: 1.25;
  }
  .zusatz {
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
  }

  .grund {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    margin-top: 9px;
    color: var(--se-ink);
    font-size: var(--se-fs);
    line-height: 1.45;
  }

  .fuss {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
  }

  .datum,
  .zeit {
    flex: none;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    margin-left: auto;
    padding: 5px 11px 5px 9px;
    border-radius: var(--se-r-sm);
    clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
    font-size: var(--se-fs-sm);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.02em;
    color: var(--se-ink);
    background: var(--fw-sanft);
    white-space: nowrap;
  }
  .chip::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--fw-stark);
  }
`
