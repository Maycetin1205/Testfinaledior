import { css } from 'lit'

export type CellsState = 'quiet' | 'changed' | 'automatic'

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

export function walkInCell(field: HTMLInputElement | null | undefined): boolean {
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
        height: calc(var(--zeilen-hoehe) - 8px);
        min-width: 0;
        padding: 0 var(--se-eingabe-x);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        color: var(--se-ink);
        background: transparent;
        border: var(--se-border) solid transparent;
        border-radius: var(--se-r-sm);
      }

      /* Kein Kaestchen in der Zeile, auch nicht unter der Schreibmarke: die
         Zelle bleibt Text wie jede andere. Nur ein Strich darunter sagt, wo
         getippt wird. */
      .cell-input:focus {
        outline: none;
        box-shadow: inset 0 -2px 0 var(--se-accent);
      }

      /* Eine Zahl sitzt rechts, in der Eingabezelle wie in jeder anderen Zelle
         der Tabelle. Nur unter dem Schreibzeiger nicht: „1," ist noch keine
         Zahl, die Schrift spraenge beim Komma hin und her. */
      .number > .cell-holder > .cell-input { text-align: right; }
      .number > .cell-holder > .cell-input:focus { text-align: left; }

      .cell-input::placeholder { color: transparent; }
      .row.capture .cell-input::placeholder { color: var(--se-faint); }
      .row:focus-within .cell-input::placeholder { color: var(--se-faint); }

      /* Vorgemerkt, noch nicht geschrieben: fett und ein Strich in Bernstein,
         keine Flaeche. Den Zeilenstand sagt der Punkt vor der Zeile. */
      .cell-input.changed {
        color: var(--se-ink);
        font-weight: 600;
        box-shadow: inset 0 -2px 0 var(--se-amber);
      }

      /* Aus dem gewaehlten Satz uebernommen: steht da wie jeder andere Wert.
         Getoente Kaestchen und Kursivschrift liessen die Zeile wie einen
         Fremdkoerper aussehen. */
      .cell-input.auto {
        color: var(--se-ink);
      }
`
