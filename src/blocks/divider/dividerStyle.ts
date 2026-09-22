import { css } from 'lit'

export const dividerStyle = css`
  :host { height: 100%; min-height: 12px; }

  .flaeche {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: inherit;
  }

  .linie {
    box-sizing: border-box;
    width: 100%;
    border-top: var(--strich-breite) var(--strich-stil) var(--strich-farbe);
  }

  .senkrecht .linie {
    width: 0;
    height: 100%;
    border-top: 0;
    border-left: var(--strich-breite) var(--strich-stil) var(--strich-farbe);
  }
`
