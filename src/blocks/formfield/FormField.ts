import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import {
  choiceProperty,
  fieldProperty,
  sourceProperty,
  textProperty,
  type Condition,
} from '../../core/block/property'
import { actionValue, bindable, type Capability } from '../../core/block/capability'
import { coerceLookupColumns, WINDOW_HEIGHT, WINDOW_WIDTH } from '../behavior/lookup'
import {
  LookupField,
  lookupProperties,
  lookupCapabilities,
} from '../behavior/lookupField'
import type { Column } from '../behavior/columns'
import { suggestionStyle } from '../behavior/suggestionList'
import { valueDisconnected, valueRegistered } from '../behavior/valueLink'
import { fieldStyle } from './formFieldStyle'

const FIELD_TYPES = ['text', 'number', 'textarea', 'select', 'date', 'time', 'checkbox', 'lookup'] as const

type FieldType = (typeof FIELD_TYPES)[number]

function fieldTypeOf(v: unknown): FieldType {
  return FIELD_TYPES.includes(v as FieldType) ? (v as FieldType) : 'text'
}

const WITH_PLACEHOLDER: readonly FieldType[] = [
  'text', 'number', 'textarea', 'select', 'lookup', 'date', 'time',
]

const PH_CLASS: Partial<Record<FieldType, string>> = {
  select: 'ph-select',
  date: 'ph-nativ',
  time: 'ph-nativ',
  lookup: 'ph-nachschlag',
}

const ONLY_LOOKUP: Condition = { key: 'fieldType', equals: 'lookup' }

const WITHOUT_VALUE: readonly FieldType[] = ['checkbox', 'lookup']

function dateForInput(value: string): string {
  const german = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  return german ? `${german[3]}-${german[2]}-${german[1]}` : value
}

function dateFromInput(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : value
}

export class FormField extends BlockElement {
  static readonly type = 'formfield'
  static readonly tag = 'ff-formfield'
  static readonly displayName = 'Formularfeld'
  static readonly category: Category = 'input'

  static readonly capabilities: readonly Capability[] = [
    { kind: 'source', when: { key: 'fieldType', notEquals: 'lookup' } },
    { kind: 'followsSelection' },
    ...lookupCapabilities(ONLY_LOOKUP),
    bindable<typeof FormField.blockProperties>([
      {
        prop: 'value',
        name: 'Wert',
        when: { key: 'fieldType', noneOf: WITHOUT_VALUE },
        previewProp: 'label',
      },
    ]),
    actionValue<typeof FormField.blockProperties>([{ prop: 'value', name: 'Wert' }]),
    { kind: 'events', list: [{ key: 'onChange', name: 'Wert geändert' }] },
  ]

  static readonly grid = { startWidth: 12, startHeight: 2, minWidth: 4, minHeight: 2 }

  static readonly blockProperties = {
    fieldType: choiceProperty([
      { value: 'text', name: 'Text' },
      { value: 'number', name: 'Zahl' },
      { value: 'textarea', name: 'Mehrzeilig' },
      { value: 'select', name: 'Auswahl' },
      { value: 'date', name: 'Datum' },
      { value: 'time', name: 'Uhrzeit' },
      { value: 'checkbox', name: 'Ankreuzfeld' },
      { value: 'lookup', name: 'Nachschlagen' },
    ], {
      default: 'text',
      label: 'Feldtyp',
      help: 'Welche Art Eingabe das Feld annimmt.',
      attribute: 'fieldtype',
    }),
    label: textProperty({
      default: 'Feldname',
      label: 'Beschriftung',
      help: 'Was vor dem Feld steht.',
      place: 'block',
      attribute: 'label',
    }),
    options: textProperty({
      default: '',
      label: 'Auswahl-Optionen',
      help: 'Einträge durch Komma getrennt, z. B. "Zimmer 1, Zimmer 2".',
      attribute: 'options',
      when: { key: 'fieldType', equals: 'select' },
    }),
    source: sourceProperty({
      default: '',
      label: 'Datenquelle',
      help: 'Die Quelle, aus der das Feld seinen Wert liest.',
      place: 'none',
      attribute: 'source',
    }),
    value: textProperty({
      default: '',
      label: 'Wert',
      help: 'Was im Feld steht, solange kein Feld gebunden ist.',
      place: 'none',
      attribute: 'value',
    }),
    valueField: fieldProperty({
      default: '',
      label: 'Feld',
      help: 'Feld, dessen Wert angezeigt wird.',
      attribute: 'valuefield',
      when: { key: 'fieldType', noneOf: WITHOUT_VALUE },
    }),
    ...lookupProperties(ONLY_LOOKUP),
    appearance: choiceProperty([
      { value: 'standard', name: 'Standard (Kasten)' },
      { value: 'line', name: 'Linie (Unterstrichen)' },
    ], {
      default: 'standard',
      label: 'Darstellung',
      help: 'Kasten oder dezente Linie (z. B. Unterschriftsbereich).',
      attribute: 'appearance',
      when: { key: 'fieldType', noneOf: ['checkbox'] },
    }),
  }

  static override styles: CSSResultGroup = [BlockElement.styles, fieldStyle, suggestionStyle]

  fieldType = 'text'

  label = 'Feldname'

  options = ''

  source = ''

  value = ''

  valueField = ''

  lookupSource = ''

  storageField = ''

  storageTitle = ''

  lookupColumns: Column[] = []

  windowWidth = WINDOW_WIDTH

  windowHeight = WINDOW_HEIGHT

  onlyHit = false

  appearance = 'standard'

  @state() private ticked = false

  @state() private inControl = false

  private readonly _lookup = new LookupField({
    block: this,
    report: () => this.requestUpdate(),
    inEditor: () => this.inEditor,
    source: () => this.lookupSource,
    storageField: () => this.storageField,
    storageTitle: () => this.storageTitle,
    columns: () => coerceLookupColumns(this.lookupColumns),
    title: () => this.label,
    width: () => this.windowWidth,
    height: () => this.windowHeight,
    onlyHit: () => this.onlyHit,
    value: () => this.value,
    setValue: (value) => { this.value = value },
    changed: () => this.dispatchEvent(new Event('change')),
  })

  fillsSelf(): boolean {
    return fieldTypeOf(this.fieldType) === 'lookup'
  }

  checkOwnValue(): void {
    if (this.fillsSelf()) this._lookup.checkValue()
  }

  private onInput(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    this.value = fieldTypeOf(this.fieldType) === 'date' ? dateFromInput(target.value) : target.value
  }

  private onChange(): void {
    this.dispatchEvent(new Event('change'))
  }

  private textTpl(cls: string, hidden = false, bound = false): TemplateResult {
    return html`<span
      class=${cls}
      ?hidden=${hidden}
      ?data-ff-bound=${bound}
      data-ff-editable
      @click=${this.onTextClick}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${this.label}</span>`
  }

  private onTextClick(): void {
    if (this.inEditor) return
    this.setTick(!this.ticked)
  }

  private setTick(on: boolean): void {
    if (this.ticked === on) return
    this.ticked = on
    this.dispatchEvent(new Event('change'))
  }

  private controlTpl(kind: FieldType): TemplateResult {
    switch (kind) {
      case 'textarea':
        return html`<textarea class="ctrl" .value=${this.value} @input=${this.onInput} @change=${this.onChange}></textarea>`
      case 'select': {
        const entries = this.options.split(',').map((o) => o.trim()).filter((o) => o !== '')
        const foreignValue = this.value !== '' && !entries.includes(this.value)
        return html`<select class="ctrl" .value=${this.value} @input=${this.onInput} @change=${this.onChange}>
          <option value="" disabled hidden></option>
          ${foreignValue ? html`<option value=${this.value} hidden>${this.value}</option>` : nothing}
          ${entries.length === 0
            ? html`<option disabled>(keine Optionen)</option>`
            : entries.map((o) => html`<option value=${o}>${o}</option>`)}
        </select>`
      }
      case 'lookup':
        return this._lookup.render('ctrl', this.label)
      default:
        return html`<input
          class="ctrl"
          type=${kind}
          .value=${kind === 'date' ? dateForInput(this.value) : this.value}
          @input=${this.onInput}
          @change=${this.onChange}
          @focus=${() => { this.inControl = true }}
          @blur=${() => { this.inControl = false }}
        />`
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this._lookup.dragTo()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)

    this.toggleAttribute('data-ff-list', this._lookup.listOpen)
  }

  override render(): TemplateResult {
    const kind = fieldTypeOf(this.fieldType)
    if (kind === 'checkbox') {
      return html`<div class="feld">
        <div class="zeile">
          <input
            class="ctrl"
            type="checkbox"
            .checked=${this.ticked}
            @change=${(e: Event) => this.setTick((e.target as HTMLInputElement).checked)}
          />
          ${this.textTpl('text')}
        </div>
      </div>`
    }

    const valueBindable = kind !== 'lookup'
    const inField = valueBindable ? this.value : this._lookup.inField
    const empty = inField === ''
    const huelleClasses = `huelle${empty ? ' leer' : ''}${this.inControl ? ' tippt' : ''}`
    const fieldClasses = `feld${this.appearance === 'line' ? ' linie' : ''}`
    return html`<div class=${fieldClasses}>
      <div
        class=${huelleClasses}
        data-ff-spot=${valueBindable ? 'value' : nothing}
        ?data-ff-bound=${valueBindable && this.valueField !== ''}
      >
        ${this.controlTpl(kind)}
        ${WITH_PLACEHOLDER.includes(kind)
          ? this.textTpl(`ph ${PH_CLASS[kind] ?? ''}`.trim(), !empty, valueBindable && this.valueField !== '')
          : nothing}
      </div>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    valueRegistered(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    valueDisconnected(this)
    this._lookup.cleanUp()
  }
}

BlockElement.defineAndRegister(FormField)
