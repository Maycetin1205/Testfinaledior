import { css, html, nothing, type TemplateResult } from 'lit'
import { suggestionListTpl, type Suggestion } from './suggestionList'

export type CellsState = 'quiet' | 'changed' | 'automatic'

export interface InputSpotPlacement {
  value: string

  title: string

  placeholder: string

  klasse: string

  holderClass: string

  slot?: number

  suggestions: readonly Suggestion[]

  mark: number

  listToTop?: boolean

  beside?: TemplateResult
}

export interface InputSpotAct {
  typing: (text: string) => void

  key: (e: KeyboardEvent) => void

  leave: (text: string) => void

  chooseSuggestion: (index: number) => void

  setMark: (index: number) => void
}

const CELL_CLASS: Record<CellsState, string> = {
  quiet: 'zell-eingabe',
  changed: 'zell-eingabe geaendert',
  automatic: 'zell-eingabe auto',
}

export function cellsClass(state: CellsState): string {
  return CELL_CLASS[state]
}

export function inputSpotTpl(
  placement: InputSpotPlacement,
  tun: InputSpotAct,
): TemplateResult {
  return html`<div
    class=${placement.listToTop === true ? `${placement.holderClass} nach-oben` : placement.holderClass}
  >
    <input
      class=${placement.klasse}
      type="text"
      data-spalte=${placement.slot ?? nothing}
      aria-label=${placement.title !== '' ? placement.title : nothing}
      placeholder=${placement.placeholder !== '' ? placement.placeholder : nothing}
      .value=${placement.value}
      @input=${(e: Event) => tun.typing((e.target as HTMLInputElement).value)}
      @keydown=${(e: KeyboardEvent) => tun.key(e)}
      @blur=${(e: Event) => tun.leave((e.target as HTMLInputElement).value)}
    />
    ${placement.beside ?? nothing}
    ${placement.suggestions.length === 0 ? nothing : suggestionListTpl({
      entries: placement.suggestions,
      mark: placement.mark,
      onChoose: (i) => tun.chooseSuggestion(i),
      onMark: (i) => tun.setMark(i),
    })}
  </div>`
}

export function cellsFields(
  root: ShadowRoot | null | undefined,
  area: string,
  slot: number,
): HTMLInputElement[] {
  const found = root?.querySelectorAll<HTMLInputElement>(
    `${area} .zell-eingabe[data-spalte="${slot}"]`,
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
      .zell-beschriftung {
        display: block;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .zell-halter {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
      }

      .zell-halter.nach-oben .vorschlaege {
        top: auto;
        bottom: 100%;
        margin: 0 0 2px;
      }

      .zell-eingabe {
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
      .zell-eingabe:focus {
        outline: none;
        box-shadow: inset 0 -2px 0 var(--se-accent);
      }

      /* Eine Zahl sitzt rechts, in der Eingabezelle wie in jeder anderen Zelle
         der Tabelle. Nur unter dem Schreibzeiger nicht: „1," ist noch keine
         Zahl, die Schrift spraenge beim Komma hin und her. */
      .zahl > .zell-halter > .zell-eingabe { text-align: right; }
      .zahl > .zell-halter > .zell-eingabe:focus { text-align: left; }

      .zell-eingabe::placeholder { color: transparent; }
      .zeile.erfassung .zell-eingabe::placeholder { color: var(--se-faint); }
      .zeile:focus-within .zell-eingabe::placeholder { color: var(--se-faint); }

      /* Vorgemerkt, noch nicht geschrieben: fett und ein Strich in Bernstein,
         keine Flaeche. Den Zeilenstand sagt der Punkt vor der Zeile. */
      .zell-eingabe.geaendert {
        color: var(--se-ink);
        font-weight: 600;
        box-shadow: inset 0 -2px 0 var(--se-amber);
      }

      /* Aus dem gewaehlten Satz uebernommen: steht da wie jeder andere Wert.
         Getoente Kaestchen und Kursivschrift liessen die Zeile wie einen
         Fremdkoerper aussehen. */
      .zell-eingabe.auto {
        color: var(--se-ink);
      }
`
