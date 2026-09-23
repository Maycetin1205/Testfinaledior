import { html, type TemplateResult } from 'lit'
import { giverIdOf, plainSelection, setSelection } from '../behavior/selection'
import {
  automaticColumns,
  onlyHitFind,
  followOnLeave,
  holeEntries,
  magnifierIcon,
  openLookup,
  recordFitsToSelection,
  closeLookupFor,
  suggestionsInWindowState,
  type Entry,
} from '../behavior/lookup'
import type { Column } from '../behavior/columns'
import { keyOf, SuggestionState } from '../behavior/suggestionState'
import { inputSpotTpl } from '../behavior/inputSpot'

// The lookup window draws its rows with the table block.
import '../table/Table'

export interface LookupControlHost {
  block: HTMLElement
  report: () => void
  inEditor: () => boolean

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

export class LookupControl {
  private display = ''

  private typed: string | null = null

  private record: unknown = undefined

  private readonly list = new SuggestionState<Entry>()

  private readonly host: LookupControlHost

  constructor(host: LookupControlHost) {
    this.host = host
  }

  get inField(): string {
    return this.typed ?? this.display
  }

  // Suggestions hang out of the field box; the block needs to know so it can
  // lift itself above the next one.
  get hangsBelow(): boolean {
    return this.list.open
  }

  dragTo(): void {
    this.list.show(this.lookAt())
  }

  render(klasse: string, title: string): TemplateResult {
    return html`${inputSpotTpl({
      value: this.inField,
      title,

      placeholder: '',
      klasse,
      holderClass: 'lookup',
      suggestions: this.list.hit,
      mark: this.list.mark,
      beside: html`<button
        class="lupe"
        type="button"
        aria-label="Nachschlagen"
        title="Nachschlagen"
        @click=${() => this.openWindow()}
      >${magnifierIcon()}</button>`,
    }, {
      typing: (value) => {
        this.typed = value
        this.list.ofFront()
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
    if (this.host.inEditor()) return
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

  private lookAt(): Entry[] {
    if (this.list.closed || this.host.inEditor()) return []
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

  private entries(): ReturnType<typeof holeEntries> {
    return holeEntries({
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
    if (this.host.inEditor()) return
    if (e.key === 'F5') e.preventDefault()
    const follow = this.list.followFor(keyOf(e), {
      listOpen: this.list.open,
      fieldEmpty: this.inField === '',
      typed: this.typed !== null,
      lookupable: true,

      hasRecords: () => true,

      jumps: false,
    })
    if (follow === 'nothing') {
      if (e.key === 'Enter') e.preventDefault()
      return
    }

    if (e.key !== 'Tab') e.preventDefault()
    if (follow === 'adopt') this.adoptSuggestion(this.list.mark)
    else if (follow === 'window') this.openWindow(this.typed ?? '')
    else if (follow === 'liste-auf') this.list.openList()
    else if (follow === 'clear') {
      this.typed = null
      this.empty()
      this.host.changed()
    }
    this.host.report()
  }

  private leave(): void {
    if (this.host.inEditor()) return
    const follow = followOnLeave(this.inField, this.display, this.host.value())
    this.typed = null
    this.list.idle()
    if (follow !== 'clear') return
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
    plainSelection(giverIdOf(this.host.block))
  }

  checkValue(): void {
    if (this.typed !== null) this.host.report()
    if (this.record !== undefined && !recordFitsToSelection(this.host.block, this.record)) {
      this.empty()
    }
    if (!this.host.onlyHit()) return
    const result = this.entries()
    if (!result.ok) return
    const hit = onlyHitFind(result.entries, this.record === undefined)
    if (hit) this.take(hit.display, hit.value, hit.record)
  }

  cleanUp(): void {
    closeLookupFor(this.host.block)
  }
}
