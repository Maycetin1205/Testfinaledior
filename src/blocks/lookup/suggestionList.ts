import { css, html, nothing, type TemplateResult } from 'lit'
import { ref } from 'lit/directives/ref.js'
import type { Column } from '../list/columns'
import { markHit, plainText } from '../list/textSearch'
import { maskState } from '../../runtime/maskState'

export const SUGGESTIONS_MAX = 50

// Rows the list shows at once; a page key moves the mark by this many.
export const SUGGESTIONS_PAGE = 12

export interface Suggestion {
  display: string

  value: string
}

export type SuggestionRow = Suggestion & { record: unknown }

// What equals the typed text comes first, then what begins with it, then the
// rest; alike ones in alphabetical order. At most SUGGESTIONS_MAX.
export function orderedSuggestions<T extends Suggestion>(
  entries: readonly T[],
  typed: string,
  texts: (entry: T) => readonly string[] = (entry) => [entry.display, entry.value],
): T[] {
  const wanted = plainText(typed.trim())
  const rank = (entry: T): number => {
    if (wanted === '') return 1
    const own = texts(entry).map((t) => plainText(t.trim()))
    if (own.some((t) => t === wanted)) return 0
    return own.some((t) => t.startsWith(wanted)) ? 1 : 2
  }
  const label = (entry: T): string => plainText(entry.display !== '' ? entry.display : entry.value)
  return entries
    .map((entry, at) => ({ entry, rank: rank(entry), label: label(entry), at }))
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'de') || a.at - b.at)
    .slice(0, SUGGESTIONS_MAX)
    .map((o) => o.entry)
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

function cellText(entry: SuggestionRow, column: Column): string {
  if (column.field === '') return entry.display !== '' ? entry.display : entry.value
  return maskState.host.readField(entry.record, column.field)
}

// The marked row stays in sight while the mark walks through a long list.
function keepInSight(el: Element | undefined): void {
  el?.scrollIntoView({ block: 'nearest' })
}

// The hits as a small table under the field: the columns of the lookup
// window, one row per hit, the typed text marked.
export function suggestionListTpl(args: {
  entries: readonly SuggestionRow[]

  columns: readonly Column[]

  typed: string

  mark: number

  onChoose: (index: number) => void

  onMark: (index: number) => void
}): TemplateResult {
  const columns = args.columns.length > 0 ? args.columns : [{ key: '', title: '', field: '' }]
  const grid = `grid-template-columns: ${columns.map(() => 'minmax(40px, auto)').join(' ')}`
  return html`<div
    class="suggestions"
    role="listbox"
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
  >${columns.some((s) => s.title !== '')
    ? html`<div class="suggestion-head" role="presentation" style=${grid}>${columns.map((s) => html`<div>${s.title}</div>`)}</div>`
    : nothing
  }${args.entries.map((entry, i) => html`<div
      class=${i === args.mark ? 'suggestion marked' : 'suggestion'}
      role="option"
      aria-selected=${i === args.mark ? 'true' : 'false'}
      style=${grid}
      ${ref((el) => { if (i === args.mark) keepInSight(el) })}
      @click=${() => args.onChoose(i)}
      @mouseenter=${() => args.onMark(i)}
    >${columns.map((s) => html`<div>${markHit(cellText(entry, s), args.typed)}</div>`)}</div>`)}</div>`
}

export const suggestionStyle = css`
  .suggestions {
    --suggestion-row: 24px;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 3;
    width: max-content;
    min-width: 100%;
    box-sizing: border-box;
    max-height: calc(var(--suggestion-row) * ${SUGGESTIONS_PAGE + 1} + 2 * var(--se-border));
    overflow: auto;
    scrollbar-width: thin;
    margin: 4px 0 0;
    padding: 0;
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

  .suggestion-head,
  .suggestion {
    display: grid;
    align-items: center;
    height: var(--suggestion-row);
    cursor: pointer;
  }

  .suggestion-head {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--se-panel);
    border-bottom: var(--se-border) solid var(--se-line-soft);
    font-size: var(--se-fs-xs);
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--se-muted);
    cursor: default;
  }

  /* The cell padding of the tables, 8px. */
  .suggestion-head > div,
  .suggestion > div {
    min-width: 0;
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .suggestion + .suggestion { border-top: var(--se-border) solid var(--se-line-soft); }

  .suggestion.marked { background: var(--se-accent-soft); }

  .suggestion mark {
    background: var(--se-warning-soft);
    color: inherit;
  }
`
