import { css } from 'lit'

type CellsState = 'quiet' | 'changed' | 'automatic'

const CELL_CLASS: Record<CellsState, string> = {
  quiet: 'cell-input',
  changed: 'cell-input changed',
  automatic: 'cell-input auto',
}

export function cellsClass(state: CellsState): string {
  return CELL_CLASS[state]
}

export function cellsFields(
  root: ShadowRoot | null | undefined,
  area: string,
  slot: number,
): HTMLInputElement[] {
  const found = root?.querySelectorAll<HTMLInputElement>(
    `${area} .cell-input[data-column="${slot}"]`,
  )
  return found === undefined ? [] : Array.from(found)
}

export function enterCell(field: HTMLInputElement | null | undefined): boolean {
  if (!field) return false
  field.focus()
  field.select()
  field.scrollIntoView({ block: 'nearest' })
  return true
}

export const cellsInputStyle = css`
      .cell-label {
        display: block;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .cell-holder {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
      }

      .cell-holder.upward .suggestions {
        top: auto;
        bottom: 100%;
        margin: 0 0 2px;
      }

      .cell-input {
        box-sizing: border-box;
        width: 100%;
        height: calc(var(--row-height) - 8px);
        min-width: 0;
        padding: 0 var(--se-input-x);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        color: var(--se-ink);
        background: transparent;
        border: var(--se-border) solid transparent;
        border-radius: var(--se-radius);
      }

      .cell-input:focus {
        outline: none;
        background: var(--se-panel);
        border-color: var(--se-accent);
        box-shadow: var(--se-focus);
      }

      /* Left while typing: a number typed up to its comma is no number yet,
         and the text would jump. */
      .number > .cell-holder > .cell-input { text-align: right; }
      .number > .cell-holder > .cell-input:focus { text-align: left; }

      .cell-input::placeholder { color: transparent; }
      .row.capture .cell-input::placeholder { color: var(--se-faint); }
      .row:focus-within .cell-input::placeholder { color: var(--se-faint); }

      /* Marked, not yet written. */
      .cell-input.changed {
        color: var(--se-ink);
        font-weight: 600;
        background: var(--se-panel);
        border-color: var(--se-accent);
      }

      /* Taken from the chosen record and shown like any other value: a tint or
         italics made the row look foreign. */
      .cell-input.auto {
        color: var(--se-ink);
      }
`
