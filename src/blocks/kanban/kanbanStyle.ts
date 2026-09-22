import { css } from 'lit'

export const kanbanStyle = css`
  :host { min-width: 0; height: 100%; display: flex; flex-direction: column; }

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
    flex-direction: row;
    align-items: stretch;
    gap: var(--se-gap-lg);
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    box-sizing: border-box;
  }

  .tafel slot { display: contents; }
`
