import { html, nothing, type TemplateResult } from 'lit'
import { suggestionListTpl, type Suggestion } from './suggestionList'

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

export function inputSpotTpl(
  placement: InputSpotPlacement,
  tun: InputSpotAct,
): TemplateResult {
  return html`<div
    class=${placement.listToTop === true ? `${placement.holderClass} upward` : placement.holderClass}
  >
    <input
      class=${placement.klasse}
      type="text"
      data-column=${placement.slot ?? nothing}
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
