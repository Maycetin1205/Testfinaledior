import { css } from 'lit'

export const kanbanColumnStyle = css`
  :host {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .spalte {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--fw-sanft);
    border-radius: var(--se-r-lg);
    font-family: var(--se-font);
  }

  .kopf {
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
    padding: 0 10px 12px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }
`
