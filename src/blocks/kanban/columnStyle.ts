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
    background: var(--tone-shell);
    border: 1.5px solid var(--tone-line);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
  }

  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 15px;
    background: var(--tone-tint);
    border-bottom: var(--se-border) solid var(--tone-line);
  }

  .dot {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--tone-strong);
  }

  .title {
    color: var(--tone-ink);
    font-size: var(--se-fs);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    margin-left: auto;
    min-width: 22px;
    padding: 1px 8px;
    border-radius: var(--se-radius);
    background: var(--se-panel);
    border: var(--se-border) solid var(--tone-line);
    text-align: center;
    font-family: var(--se-mono);
    font-size: var(--se-fs-sm);
    font-weight: 600;
    color: var(--tone-ink);
  }

  .body {
    padding: 11px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--se-gap);
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }
`
