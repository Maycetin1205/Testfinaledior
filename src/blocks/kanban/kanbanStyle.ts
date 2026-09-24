import { css } from 'lit'

export const kanbanStyle = css`
  :host { min-width: 0; height: 100%; display: flex; flex-direction: column; }

  .board {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 15px;
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    box-sizing: border-box;
  }

  .board slot { display: contents; }
`
