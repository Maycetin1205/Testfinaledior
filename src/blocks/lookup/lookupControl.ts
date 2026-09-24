import { html, type ReactiveController, type TemplateResult } from 'lit'
import type { BlockElement } from '../base/BlockElement'
import { giverIdOf, clearSelection, setSelection, rowsToSelection } from '../../runtime/selection'
import {
  automaticColumns,
  fetchEntries,
  openLookup,
  closeLookupFor,
  suggestionsInWindowState,
  type Entry,
} from './lookup'
import type { Column } from '../list/columns'
import { keyOf, SuggestionState } from './suggestionState'
import { inputSpotTpl } from './inputSpot'

export function magnifierIcon(): TemplateResult {
  return html`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
      <line x1="10.4" y1="10.4" x2="14" y2="14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></line>
    </svg>`
}

function findOnlyHit(
  entries: readonly Entry[],
  fieldEmpty: boolean,
): Entry | null {
  return fieldEmpty && entries.length === 1 ? entries[0] : null
}

function recordFitsSelection(el: HTMLElement, record: unknown): boolean {
  const { rows, filtered } = rowsToSelection(el, [record])
  return !filtered || rows.length > 0
}

type LeaveAction = 'nothing' | 'clear' | 'back'

function actionOnLeave(
  typed: string,

  confirmedDisplay: string,
  confirmedValue: string,
): LeaveAction {
  if (typed === '') {
    return confirmedDisplay === '' && confirmedValue === '' ? 'nothing' : 'clear'
  }
  return typed === confirmedDisplay ? 'nothing' : 'back'
}

interface LookupControlHost {
  block: BlockElement
  report: () => void

  source: () => string
  storageField: () => string
  storageTitle: () => string
  columns: () => readonly Column[]
  title: () => string
  width: () => number
  height: () => number
  onlyHit: () => boolean

  value: () => string
  setValue: (value: string) => void
  changed: () => void
}

export class LookupControl implements ReactiveController {
  private display = ''

  private typed: string | null = null

  private record: unknown = undefined

  private readonly list = new SuggestionState<Entry>()

  private readonly host: LookupControlHost

  constructor(host: LookupControlHost) {
    this.host = host
    host.block.addController(this)
  }

  get inField(): string {
    return this.typed ?? this.display
  }

  // Suggestions hang out of the field box; the block needs to know so it can
  // lift itself above the next one.
  get hangsBelow(): boolean {
    return this.list.open
  }

  hostUpdate(): void {
    this.list.show(this.currentSuggestions())
  }

  render(inputClass: string, title: string): TemplateResult {
    return html`${inputSpotTpl({
      value: this.inField,
      title,

      placeholder: '',
      inputClass,
      holderClass: 'lookup',
      suggestions: this.list.hit,
      mark: this.list.mark,
      beside: html`<button
        class="magnifier"
        type="button"
        aria-label="Nachschlagen"
        title="Nachschlagen"
        @click=${() => this.openWindow()}
      >${magnifierIcon()}</button>`,
    }, {
      typing: (value) => {
        this.typed = value
        this.list.restart()
        this.host.report()
      },
      key: (e) => this.key(e),
      leave: () => this.leave(),
      chooseSuggestion: (i) => this.adoptSuggestion(i),
      setMark: (i) => {
        this.list.setMark(i)
        this.host.report()
      },
    })}`
  }

  private openWindow(searchText = ''): void {
    openLookup({
      el: this.host.block,
      sourceId: this.host.source(),
      storageField: this.host.storageField(),
      storageTitle: this.host.storageTitle(),
      columns: this.host.columns(),
      title: this.host.title(),
      width: this.host.width(),
      height: this.host.height(),
      searchText,

      backFocus: () => this.host.block.shadowRoot
        ?.querySelector<HTMLInputElement>('.lookup .ctrl')?.focus(),
      onAdopt: (display, value, record) => this.adoptAndReport(display, value, record),
    })
  }

  private currentSuggestions(): Entry[] {
    if (this.list.closed) return []
    if (this.typed === null && !this.list.opened) return []
    const typed = this.typed ?? ''

    if (typed === '' && !this.list.opened) return []

    const result = this.entries()
    if (!result.ok) return []

    const own = this.host.columns()
    return suggestionsInWindowState(
      result.entries,
      typed,
      own.length > 0 ? own : this.automatic(),
      this.host.block,
    )
  }

  private entries(): ReturnType<typeof fetchEntries> {
    return fetchEntries({
      el: this.host.block,
      sourceId: this.host.source(),
      storageField: this.host.storageField(),
      columns: this.host.columns(),
    })
  }

  private automatic(): Column[] {
    return automaticColumns({
      storageField: this.host.storageField(),
      storageTitle: this.host.storageTitle(),
    })
  }

  private key(e: KeyboardEvent): void {
    if (this.host.block.preview) return
    if (e.key === 'F5') e.preventDefault()
    const action = this.list.actionFor(keyOf(e), {
      listOpen: this.list.open,
      fieldEmpty: this.inField === '',
      typed: this.typed !== null,
      lookupable: true,

      hasRecords: () => true,

      jumps: false,
    })
    if (action === 'nothing') {
      if (e.key === 'Enter') e.preventDefault()
      return
    }

    if (e.key !== 'Tab') e.preventDefault()
    if (action === 'adopt') this.adoptSuggestion(this.list.mark)
    else if (action === 'window') this.openWindow(this.typed ?? '')
    else if (action === 'openList') this.list.openList()
    else if (action === 'clear') {
      this.typed = null
      this.empty()
      this.host.changed()
    }
    this.host.report()
  }

  private leave(): void {
    if (this.host.block.preview) return
    const action = actionOnLeave(this.inField, this.display, this.host.value())
    this.typed = null
    this.list.idle()
    if (action !== 'clear') return
    this.empty()
    this.host.changed()
  }

  private adoptSuggestion(index: number): void {
    const hit = this.list.hit[index]
    if (!hit) return
    this.adoptAndReport(hit.display, hit.value, hit.record)
  }

  private adoptAndReport(display: string, value: string, record: unknown): void {
    this.typed = null
    this.list.idle()
    this.take(display, value, record)
    this.host.changed()
  }

  private take(display: string, value: string, record: unknown): void {
    this.display = display !== '' ? display : value
    this.host.setValue(value)
    this.record = record

    setSelection(giverIdOf(this.host.block), record, true)
  }

  private empty(): void {
    this.record = undefined
    this.display = ''
    this.host.setValue('')
    this.list.idle()
    clearSelection(giverIdOf(this.host.block))
  }

  checkValue(): void {
    if (this.typed !== null) this.host.report()
    if (this.record !== undefined && !recordFitsSelection(this.host.block, this.record)) {
      this.empty()
    }
    if (!this.host.onlyHit()) return
    const result = this.entries()
    if (!result.ok) return
    const hit = findOnlyHit(result.entries, this.record === undefined)
    if (hit) this.take(hit.display, hit.value, hit.record)
  }

  hostDisconnected(): void {
    closeLookupFor(this.host.block)
  }
}
