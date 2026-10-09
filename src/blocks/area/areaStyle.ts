import { css, unsafeCSS } from 'lit'
import { AREA_COLUMNS, GRID, gridAreaCss } from '../../core/block/grid'

// The card of the sample docs/design/behandlung-modern.html (.card): white,
// without a border, on a soft shadow; the head carries the title as text.
// Head and padding take whole rows of the grid, so an area holds as many rows
// as before the new look: the head and the room below make four rows, the
// room above and below a box one.
const PITCH = GRID.rowPx + GRID.gapPx
const ROOM = 12
const HEAD = 4 * PITCH - ROOM
const BOX_ROOM = (PITCH - GRID.gapPx) / 2

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
    border-radius: var(--se-radius-card);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  /* Kasten and Kopfzeile: the white card. */
  .appearance-box,
  .appearance-headed {
    background: var(--se-card-bg);
    box-shadow: var(--se-shadow-card);
  }
  .appearance-box .body { padding: ${unsafeCSS(BOX_ROOM)}px ${unsafeCSS(ROOM)}px; }
  /* A table, a list or a board inside the card lies flat on it. */
  .appearance-box .body,
  .appearance-headed .body { --se-surface-shadow: none; }
  .appearance-headed .body { padding: 0 ${unsafeCSS(ROOM)}px ${unsafeCSS(ROOM)}px; }

  /* Fläche voll, Fläche leicht and Nur Rand lay the tone on a free area and
     on a box: the ground and the line of the emphasis, the line drawn inside,
     no shadow. Nur Schrift leaves them as they are. */
  .appearance-plain:not(.emphasis-text),
  .appearance-box:not(.emphasis-text) {
    background: var(--look-ground);
    box-shadow: none;
    outline: var(--se-border) solid var(--look-edge);
    outline-offset: calc(-1 * var(--se-border));
  }

  /* The head, .card .hd: the title as text on the card. Fläche voll and
     Fläche leicht lay a band of the tone under it, Nur Rand draws the card's
     edge in the tone instead of the shadow, Nur Schrift colors the title. */
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
  .appearance-headed.emphasis-outline {
    box-shadow: none;
    outline: var(--se-border) solid var(--look-edge);
    outline-offset: calc(-1 * var(--se-border));
  }
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
    overflow: clip;
    ${unsafeCSS(gridAreaCss(`var(${AREA_COLUMNS}, ${GRID.columns})`))};
  }

  .body slot { display: contents; }
`
