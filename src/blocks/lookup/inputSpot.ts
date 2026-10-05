import { html, nothing, type TemplateResult } from 'lit'
import type { Column } from '../list/columns'
import { suggestionListTpl, type SuggestionRow } from './suggestionList'

interface InputSpotPlacement {
  value: string

  title: string

  placeholder: string

  inputClass: string

  holderClass: string

  slot?: number

  suggestions: readonly SuggestionRow[]

  // The columns of the lookup window; the hits stand in them.
  columns: readonly Column[]

  // What the operator typed, marked in every hit.
  typed: string

  mark: number

  listToTop?: boolean

  // A filled field is marked whole when the cursor comes in, also by click.
  marksOnEntering?: boolean

  beside?: TemplateResult
}

// A click would move the cursor to its spot right after the field is marked.
const enteringByPointer = new WeakSet<HTMLInputElement>()

const marking = {
  pointerdown: (e: PointerEvent): void => {
    const field = e.currentTarget as HTMLInputElement
    if (!field.matches(':focus')) enteringByPointer.add(field)
  },
  mouseup: (e: MouseEvent): void => {
    const field = e.currentTarget as HTMLInputElement
    if (enteringByPointer.delete(field) && field.value !== '') e.preventDefault()
  },
  focus: (e: FocusEvent): void => {
    const field = e.currentTarget as HTMLInputElement
    if (field.value !== '') field.select()
  },
}

interface InputSpotAct {
  typing: (text: string) => void

  key: (e: KeyboardEvent) => void

  leave: (text: string) => void

  chooseSuggestion: (index: number) => void

  setMark: (index: number) => void
}

export function inputSpotTpl(
  placement: InputSpotPlacement,
  act: InputSpotAct,
): TemplateResult {
  return html`<div
    class=${placement.listToTop === true ? `${placement.holderClass} upward` : placement.holderClass}
  >
    <input
      class=${placement.inputClass}
      type="text"
      data-column=${placement.slot ?? nothing}
      aria-label=${placement.title !== '' ? placement.title : nothing}
      placeholder=${placement.placeholder !== '' ? placement.placeholder : nothing}
      .value=${placement.value}
      @input=${(e: Event) => act.typing((e.target as HTMLInputElement).value)}
      @keydown=${(e: KeyboardEvent) => act.key(e)}
      @blur=${(e: Event) => act.leave((e.target as HTMLInputElement).value)}
      @pointerdown=${placement.marksOnEntering === true ? marking.pointerdown : nothing}
      @mouseup=${placement.marksOnEntering === true ? marking.mouseup : nothing}
      @focus=${placement.marksOnEntering === true ? marking.focus : nothing}
    />
    ${placement.beside ?? nothing}
    ${placement.suggestions.length === 0 ? nothing : suggestionListTpl({
      entries: placement.suggestions,
      columns: placement.columns,
      typed: placement.typed,
      mark: placement.mark,
      onChoose: (i) => act.chooseSuggestion(i),
      onMark: (i) => act.setMark(i),
    })}
  </div>`
}
