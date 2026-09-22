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

  .tafel .leer { flex: 1; align-self: center; }
`
