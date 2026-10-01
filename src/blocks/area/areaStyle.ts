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
    /* No padding: the columns inside lie on the grid of the page. */
    padding: 0;
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-line-soft);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }

  .body slot { display: contents; }
`
