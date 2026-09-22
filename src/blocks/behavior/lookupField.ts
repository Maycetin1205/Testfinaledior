import { html, type TemplateResult } from 'lit'
import {
  booleanProperty,
  fieldProperty,
  numberProperty,
  sourceProperty,
  structuredProperty,
  textProperty,
  type Condition,
} from '../../core/block/property'
import type { Capability } from '../../core/block/capability'
import { giverIdOf, plainSelection, setSelection } from './selection'
import {
  automaticColumns,
  coerceLookupColumns,
  onlyHitFind,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  followOnLeave,
  holeEntries,
  magnifierIcon,
  LOOKUP_COLUMNS_BINDING,
  openLookup,
  recordFitsToSelection,
  closeLookupFor,
  suggestionsInWindowState,
  type Entry,
} from './lookup'
import type { Column } from './columns'
import { keyOf, SuggestionState } from './suggestionState'
import { inputSpotTpl } from './inputSpot'

// What a lookup field carries, declared once for every block that has one.
export function lookupProperties(when?: Condition) {
  return {
    lookupSource: sourceProperty({
      default: '',
      label: 'Quelle',
      help: 'Quelle, aus der der Bediener eine Zeile wählt.',
      attribute: 'lookupsource',
      ...(when ? { when } : {}),
    }),
    storageField: fieldProperty({
      default: '',
      label: 'Gespeichert wird',
      help: 'Feld, dessen Wert die Maske sich merkt (z. B. die Nummer).',
      attribute: 'storagefield',
      sourceProp: 'lookupSource',
      plainNameProp: 'storageTitle',
      ...(when ? { when } : {}),
    }),
    storageTitle: textProperty({
      default: '',
      label: 'Gespeichert wird — Klarname',
      help: 'Der lesbare Name des gespeicherten Feldes.',
      place: 'none',
      attribute: 'storagetitle',
    }),
    lookupColumns: structuredProperty<Column[]>({
      read: (raw) => (raw === undefined || Array.isArray(raw)
        ? { ok: true, value: coerceLookupColumns(raw) }
        : { ok: false, reason: 'Spaltenliste erwartet' }),
      toAttribute: (value) => JSON.stringify(value),
      fromAttribute: (raw) => coerceLookupColumns(raw ?? ''),
    }, {
      default: [],
      label: 'Spalten im Fenster',
      help: 'Was das Nachschlage-Fenster zeigt.',
      place: 'none',
      attribute: 'lookupcolumns',
    }),
    windowWidth: numberProperty({
      default: WINDOW_WIDTH,
      label: 'Fensterbreite',
      help: 'Breite des Nachschlage-Fensters in Pixeln.',
      place: 'none',
      attribute: 'lookupwidth',
    }),
    windowHeight: numberProperty({
      default: WINDOW_HEIGHT,
      label: 'Fensterhöhe',
      help: 'Höhe des Nachschlage-Fensters in Pixeln.',
      place: 'none',
      attribute: 'lookupheight',
    }),
    onlyHit: booleanProperty({
      default: false,
      label: 'Einzigen Treffer übernehmen',
      help: 'Bleibt genau ein Satz übrig, übernimmt das Feld ihn von selbst.',
      attribute: 'onlyhit',
      ...(when ? { when } : {}),
    }),
  }
}

export function lookupCapabilities(when?: Condition): Capability[] {
  return [
    { kind: 'recordPick', sourceProp: 'lookupSource', when },
    { kind: 'list', binding: LOOKUP_COLUMNS_BINDING },
    {
      kind: 'lookupWindow',
      window: {
        columnsKey: 'lookupColumns',
        widthKey: 'windowWidth',
        heightKey: 'windowHeight',
        sourceProp: 'lookupSource',
        storageFieldProp: 'storageField',
        storageTitleProp: 'storageTitle',
        automatic: 'Ohne Spalten zeigt das Fenster eine: das gespeicherte Feld.'
          + ' Die erste Spalte ist, was nach der Wahl im Feld steht.',
        spot: '.lupe',
        when,
      },
    },
  ]
}

export interface LookupFieldHost {
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

export class LookupField {
  private display = ''

  private typed: string | null = null

  private record: unknown = undefined

  private readonly list = new SuggestionState<Entry>()

  private readonly host: LookupFieldHost

  constructor(host: LookupFieldHost) {
    this.host = host
  }

  get inField(): string {
    return this.typed ?? this.display
  }

  get listOpen(): boolean {
    return this.list.open
  }

  dragTo(): void {
    this.list.show(this.computeSuggestions())
  }

  render(klasse: string, title: string): TemplateResult {
    return inputSpotTpl({
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
      },
      key: (e) => this.key(e),
      leave: () => this.leave(),
      chooseSuggestion: (i) => this.adoptSuggestion(i),
      setMark: (i) => {
        this.list.setMark(i)
        this.host.report()
      },
    })
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
        ?.querySelector<HTMLInputElement>('.nachschlag .ctrl')?.focus(),
      onAdopt: (display, value, record) => this.adoptAndReport(display, value, record),
    })
  }

  private computeSuggestions(): Entry[] {
    if (this.list.closed || this.host.inEditor()) return []
    if (this.typed === null && !this.list.opened) return []
    const result = this.entries()
    if (!result.ok) return []
    const typed = this.typed ?? ''

    if (typed === '' && !this.list.opened) return []
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
