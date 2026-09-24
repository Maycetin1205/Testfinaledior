import { css } from 'lit'

export const columnStyle = css`
  :host {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .column {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--tone-soft);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
  }

  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--se-gap-sm);
    padding: 10px 12px;
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    background: var(--tone-strong);
  }

  .title {
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    margin-left: auto;
    min-width: 22px;
    padding: 1px 8px;
    line-height: 1;
    border-radius: var(--se-radius);
    background: var(--se-panel);
    border: var(--se-border) solid var(--tone-strong);
    text-align: center;
    font-family: var(--se-mono);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--se-ink);
  }

  .body {
    padding: 0 10px 12px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }
`
