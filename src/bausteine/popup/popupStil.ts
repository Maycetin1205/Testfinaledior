// Das Aussehen des Fensters: unsichtbar bis es offen ist, innen eine Rasterflaeche.
import { css, unsafeCSS } from 'lit'
import { rasterFlaecheCss } from '../../kern/maske/raster'

export const popupStil = css`
  :host { display: none; }
  :host([offen]),
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
    ${unsafeCSS(rasterFlaecheCss())};
  }

  .rumpf slot { display: contents; }
`
