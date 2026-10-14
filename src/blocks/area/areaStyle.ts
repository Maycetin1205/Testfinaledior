import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'

// Sections, not cards (Tonprobe 3, 14.10.): a Kopfzeile is a section of the
// sheet, its title over a hairline; a Kasten a light grey box, no line, no
// shadow. Head and padding take whole rows of the grid, so an area holds as
// many rows as before the new look: the head and the room below make four
// rows, the room above and below a box one.
const PITCH = GRID.rowPx + GRID.gapPx
const ROOM = 12
const HEAD = 4 * PITCH - ROOM

// The head of a card, which a window of the mask wears as well.
export const CARD_HEAD_PX = HEAD
const BOX_ROOM = (PITCH - GRID.gapPx) / 2

export const areaStyle = css`
  :host { display: block; height: 100%; }

  .frame {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: var(--se-radius-card);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  /* In the mask the area cuts what reaches over its edge; clip, not hidden:
     the box does not scroll even when a field outside of it takes the focus.
     On the canvas it does not cut: the editor draws the selection and the
     grips of a block over the block's edge, and at the edge of the area the
     cut would take them away. */
  :host(:not([preview])) .frame,
  :host(:not([preview])) .body { overflow: clip; }

  /* Every area but a free one is a box with a line (14.10., the user on
     sections without one: „randlos, leer“). Kasten: white in the line.
     Kopfzeile: a group box, its title on a light head over the line. */
  .appearance-box,
  .appearance-headed,
  .appearance-band {
    border: var(--se-hair);
    border-radius: var(--se-radius);
  }
  .appearance-box { background: var(--se-panel); }
  .appearance-headed .head {
    background: var(--se-head-ground);
    border-bottom: var(--se-border) solid var(--se-head-line);
    border-radius: var(--se-radius) var(--se-radius) 0 0;
  }
  .appearance-box .body { padding: ${unsafeCSS(BOX_ROOM)}px ${unsafeCSS(ROOM)}px; }
  .appearance-headed .body { padding: 0 ${unsafeCSS(ROOM)}px ${unsafeCSS(ROOM)}px; }

  /* Fläche voll, Fläche leicht and Nur Rand lay the tone on a free area and
     on a box: the ground and the line of the emphasis; on the free area the
     line is drawn inside, the box takes it as its own. A light box keeps a
     line in its tone. Nur Schrift leaves them as they are. */
  .appearance-plain:not(.emphasis-text) {
    background: var(--look-ground);
    outline: var(--se-border) solid var(--look-edge);
    outline-offset: calc(-1 * var(--se-border));
  }
  .appearance-box:not(.emphasis-text) {
    background: var(--look-ground);
    border-color: var(--look-edge);
  }
  .appearance-box.emphasis-soft { border-color: var(--tone-line); }

  /* Band: the head of the sheet, like the head of a letter: the light
     blue-grey of a head, in its line; the columns inside stay those of the
     sheet. It belongs at the top of the page, over the whole width. */
  .appearance-band {
    background: var(--se-head-ground);
    border-color: var(--se-head-line);
  }

  /* The head: the title as text over the section. Fläche voll and Fläche
     leicht lay a band of the tone under it, Nur Rand draws the section's edge
     in the tone, Nur Schrift colors the title. */
  .head {
    flex: none;
    box-sizing: border-box;
    height: ${unsafeCSS(HEAD)}px;
    display: flex;
    align-items: center;
    gap: var(--se-gap);
    padding: 0 22px;
    color: var(--se-ink);
    font-size: var(--se-fs-name);
    font-weight: 700;
    letter-spacing: -.01em;
  }
  .emphasis-solid .head,
  .emphasis-soft .head {
    background: var(--look-ground);
    color: var(--look-ink);
  }
  .appearance-headed.emphasis-outline { border-color: var(--look-edge); }
  .appearance-headed.emphasis-text:not(.tone-neutral) .head { color: var(--look-ink); }

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
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }

  .body slot { display: contents; }
`
