import { css, unsafeCSS } from 'lit'
import { gridAreaCss } from '../../core/block/grid'

export const popupStyle = css`
  :host { display: none; }
  :host([open]),
  :host([data-ff-editor]) {
    display: block;
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    z-index: 10;
    font-family: var(--se-font);
  }

  .titel {
    display: block;
    min-height: 1.4em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rumpf {
    box-sizing: border-box;
    height: 100%;
    overflow: auto;
    padding: 12px;
    ${unsafeCSS(gridAreaCss())};
  }

  .rumpf slot { display: contents; }
`
