import { css, html, nothing, type TemplateResult } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { plainText, rowFits } from '../list/textSearch'

export const SUGGESTIONS_MAX = 8

export interface Suggestion {
  display: string

  value: string
}

const textCompare = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

function beginsWith(entry: Suggestion, typed: string): boolean {
  const t = plainText(typed.trim())
  if (t === '') return false
  return plainText(entry.display.trim()).startsWith(t)
    || plainText(entry.value.trim()).startsWith(t)
}

function orderSuggestions<T extends Suggestion>(
  hit: readonly T[],
  typed: string,
): T[] {
  return [...hit].sort((a, b) => {
    const aBegins = beginsWith(a, typed)
    const bBegins = beginsWith(b, typed)
    if (aBegins !== bBegins) return aBegins ? -1 : 1
    return textCompare.compare(a.display.trim(), b.display.trim())
  })
}

export function fittingSuggestions<T extends Suggestion>(
  entries: readonly T[],
  typed: string,
  max: number = SUGGESTIONS_MAX,
  orderKeep = false,
): T[] {
  if (typed.trim() === '') return []

  const hit: T[] = []
  for (const entry of entries) {
    if (rowFits([entry.display, entry.value], typed)) hit.push(entry)
  }
  return (orderKeep ? hit : orderSuggestions(hit, typed)).slice(0, max)
}

function areaLimits(el: HTMLElement): { left: number; right: number } {
  let left = 0
  let right = typeof window !== 'undefined' && window.innerWidth > 0
    ? window.innerWidth
    : (typeof document !== 'undefined' && document.documentElement?.clientWidth > 0
        ? document.documentElement.clientWidth
        : 10000)

  const table = el.closest?.('.table')
  if (table instanceof (globalThis.HTMLElement ?? Object) && typeof table.getBoundingClientRect === 'function') {
    const tRect = table.getBoundingClientRect()
    if (tRect.width > 0) {
      left = Math.max(left, tRect.left)
      right = Math.min(right, tRect.right)
    }
    return { left, right }
  }

  const root = typeof el.getRootNode === 'function' ? el.getRootNode() : null
  if (root instanceof (globalThis.ShadowRoot ?? Object) && (root as ShadowRoot).host instanceof (globalThis.HTMLElement ?? Object)) {
    const parent = (root as ShadowRoot).host.parentElement
    if (parent && typeof parent.getBoundingClientRect === 'function') {
      const pRect = parent.getBoundingClientRect()
      if (pRect.width > 0) {
        left = Math.max(left, pRect.left)
        right = Math.min(right, pRect.right)
      }
    }
  }

  return { left, right }
}

function alignSuggestionsFrom(el: HTMLElement): void {
  if (!el || typeof el.getBoundingClientRect !== 'function') return
  const parent = el.parentElement
  if (!parent) return

  el.style.maxWidth = ''

  const holderRect = typeof parent.getBoundingClientRect === 'function'
    ? parent.getBoundingClientRect()
    : { left: 0, right: 0, width: 0 }
  const holderWidth = parent.offsetWidth || holderRect.width || 0
  const holderLeft = holderRect.left || 0
  const holderRight = holderRect.right || (holderLeft + holderWidth)

  const need = el.offsetWidth || (typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect().width : 0)
  if (need <= 0) return

  const limits = areaLimits(el)
  const wouldRight = holderLeft + need

  const toLeft = wouldRight > limits.right
  el.classList.toggle('leftward', toLeft)

  const maxWidth = toLeft
    ? Math.max(holderWidth, holderRight - limits.left)
    : Math.max(holderWidth, limits.right - holderLeft)

  if (maxWidth > 0 && Number.isFinite(maxWidth)) {
    el.style.maxWidth = `${Math.floor(maxWidth)}px`
  }
}

export function suggestionListTpl(args: {
  entries: readonly Suggestion[]

  mark: number

  onChoose: (index: number) => void

  onMark: (index: number) => void
}): TemplateResult {
  return html`<ul
    class="suggestions"
    ${ref((el) => {
      if (el && 'classList' in el && 'style' in el) {
        alignSuggestionsFrom(el as HTMLElement)
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            if ((el as HTMLElement).isConnected) alignSuggestionsFrom(el as HTMLElement)
          })
        }
      }
    })}
    @mousedown=${(e: MouseEvent) => e.preventDefault()}
  >${args.entries.map((entry, i) => html`<li
      class=${i === args.mark ? 'suggestion marked' : 'suggestion'}
      @click=${() => args.onChoose(i)}
      @mouseenter=${() => args.onMark(i)}
    ><span class="suggestion-display">${entry.display !== '' ? entry.display : entry.value}</span>${
      entry.value !== '' && entry.value !== entry.display
        ? html`<span class="suggestion-value">${entry.value}</span>`
        : nothing
    }</li>`)}</ul>`
}

export const suggestionStyle = css`
  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 3;
    width: max-content;
    min-width: 100%;
    box-sizing: border-box;
    max-height: 240px;
    overflow: auto;
    margin: 4px 0 0;
    padding: 4px;
    list-style: none;
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-line);
    border-radius: var(--se-radius);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  .suggestions.leftward {
    left: auto;
    right: 0;
  }

  .suggestion {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    padding: 7px 9px;
    border-radius: var(--se-radius);
    white-space: nowrap;
    cursor: pointer;
  }

  .suggestion-display {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 700;
  }

  .suggestion-value {
    color: var(--se-muted);
    font-size: var(--se-fs-head);
  }

  .suggestion.marked { background: var(--se-accent-soft); }
`
