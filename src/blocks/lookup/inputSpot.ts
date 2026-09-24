import { html, nothing, type TemplateResult } from 'lit'
import { suggestionListTpl, type Suggestion } from './suggestionList'

interface InputSpotPlacement {
  value: string

  title: string

  placeholder: string

  inputClass: string

  holderClass: string

  slot?: number

  suggestions: readonly Suggestion[]

  mark: number

  listToTop?: boolean

  beside?: TemplateResult
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
    />
    ${placement.beside ?? nothing}
    ${placement.suggestions.length === 0 ? nothing : suggestionListTpl({
      entries: placement.suggestions,
      mark: placement.mark,
      onChoose: (i) => act.chooseSuggestion(i),
      onMark: (i) => act.setMark(i),
    })}
  </div>`
}
