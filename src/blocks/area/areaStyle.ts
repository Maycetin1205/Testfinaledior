import { css, unsafeCSS } from 'lit'
import { gridAreaCss } from '../../core/block/grid'

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .rumpf {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    /* clip statt hidden: der Kasten rollt auch dann nicht, wenn ein Feld ausserhalb
       den Fokus bekommt. Er zeigt, was in ihn passt, und schneidet den Rest ab. */
    overflow: clip;
    padding: var(--se-gap-sm);
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-r-md);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
    ${unsafeCSS(gridAreaCss())};
  }

  .rumpf slot { display: contents; }
`
