import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .body {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    /* clip, not hidden: the box does not scroll even when a field outside of it
       takes the focus. */
    overflow: clip;
    /* One gap of room between the frame and what lies inside; the frame itself
       takes no room. */
    padding: var(--se-gap);
    background: var(--se-panel);
    outline: var(--se-border) solid var(--se-line-soft);
    outline-offset: calc(-1 * var(--se-border));
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }

  .body slot { display: contents; }
`
