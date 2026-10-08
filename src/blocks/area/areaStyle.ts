import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .frame {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    /* clip, not hidden: the box does not scroll even when a field outside of it
       takes the focus. */
    overflow: clip;
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  /* The box: one gap of room between the frame and what lies inside; the
     frame itself takes no room. */
  .appearance-box {
    background: var(--se-panel);
    outline: var(--se-border) solid var(--se-line-soft);
    outline-offset: calc(-1 * var(--se-border));
  }
  .appearance-box .body { padding: var(--se-gap); }

  /* The box with a head, as .vraum of the reception mask: the line and the
     head in the tone, the title in its ink. */
  .appearance-headed {
    background: var(--se-panel);
    border: 1.5px solid var(--tone-line);
  }
  .appearance-headed .body { padding: var(--se-gap); }

  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--se-gap);
    padding: 8px 12px;
    background: var(--tone-soft);
    color: var(--tone-ink);
    font-weight: 600;
  }

  .head-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .body {
    box-sizing: border-box;
    flex: 1 1 auto;
    min-height: 0;
    overflow: clip;
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }

  .body slot { display: contents; }
`
