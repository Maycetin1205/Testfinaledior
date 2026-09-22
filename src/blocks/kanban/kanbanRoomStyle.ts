import { css } from 'lit'

export const kanbanRoomStyle = css`
  :host { display: block; }

  .kopf {
    padding: 2px 2px 0;
    font-family: var(--se-font);
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

  .rumpf {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .zimmer {
    border-radius: var(--se-r-md);
  }
`
