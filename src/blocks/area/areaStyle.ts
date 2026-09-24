import { css, unsafeCSS } from 'lit'
import { gridAreaCss } from '../../core/block/grid'

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .body {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    /* clip, not hidden: the box does not scroll even when a field outside of it
       takes the focus. */
    overflow: clip;
    padding: var(--se-gap-sm);
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
    ${unsafeCSS(gridAreaCss())};
  }

  .body slot { display: contents; }
`
