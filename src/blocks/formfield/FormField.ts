import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { live } from 'lit/directives/live.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { reportsHeight } from '../base/heightReport'
import { actionValue, bindable, type ValueCarrier } from '../../core/block/capability'
import { propertyVisible } from '../../core/block/property'
import { LOOKUP_COLUMNS_BINDING } from '../lookup/lookup'
import { dayKey } from '../../runtime/chosenDay'
import { asNumber } from '../../core/data/number'
import { suggestionStyle } from '../lookup/suggestionList'
import { LookupControl } from '../lookup/lookupControl'
import { icon, type IconName } from '../parts/icons'
import { tickBoxStyle, tickBoxTpl } from '../parts/tickBox'
import { symbolTpl } from '../look/symbol'
// The lookup window draws its rows with the table block.
import '../table/Table'
import { disconnectValue, connectValue } from './valueBinding'
import { fieldStyle } from './formFieldStyle'
import {
  FIELD_TYPES,
  NOT_CHECKBOX,
  ONLY_LOOKUP,
  WITH_VALUE,
  formFieldProperties,
  type FieldType,
  type FormFieldValues,
} from './properties'

function fieldTypeOf(v: unknown): FieldType {
  return FIELD_TYPES.includes(v as FieldType) ? (v as FieldType) : 'text'
}

// The date input speaks yyyy-mm-dd, the mask keeps dd.mm.yyyy. Both ways are
// exact inverses, so a year half typed (0202) comes back as it went out and
// the input keeps the segment the operator types in.
function dateFromInput(value: string): string {
  const iso = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value)
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : value
}

function dateForInput(value: string): string {
  const german = /^(\d{2})\.(\d{2})\.(\d{4,})$/.exec(value)
  return german ? `${german[3]}-${german[2]}-${german[1]}` : dayKey(value) || value
}

// The number input speaks 32.4, SoftEngine and the mask keep 32,4. A value
// that is no number leaves the input empty.
function numberFromInput(value: string): string {
  return value.replace('.', ',')
}

function numberForInput(value: string): string {
  const number = asNumber(value)
  return number === null ? '' : String(number)
}

function forInput(kind: FieldType, value: string): string {
  if (kind === 'date') return dateForInput(value)
  return kind === 'number' ? numberForInput(value) : value
}

function fromInput(kind: FieldType, value: string): string {
  if (kind === 'date') return dateFromInput(value)
  return kind === 'number' ? numberFromInput(value) : value
}

// What a field shows on its right: how it is filled in. A lookup has its
// magnifier there, a button of its own.
const SIGNS: Partial<Record<FieldType, IconName>> = {
  select: 'caretDown',
  date: 'calendar',
  time: 'clock',
}

export interface FormField extends FormFieldValues {}

export class FormField extends BlockElement implements ValueCarrier {
  static readonly type = 'formfield'
  static readonly tag = 'ff-formfield'

  static override styles: CSSResultGroup = [BlockElement.styles, fieldStyle, tickBoxStyle, suggestionStyle]

  private valueAtFocus = ''
  private typed = false

  private readonly _lookup = new LookupControl({
    block: this,
    report: () => this.requestUpdate(),
    source: () => this.lookupSource,
    storageField: () => this.storageField,
    storageTitle: () => this.storageTitle,
    columns: () => this.lookupColumns,
    title: () => this.label,
    width: () => this.windowWidth,
    height: () => this.windowHeight,
    onlyHit: () => this.onlyHit,
    value: () => this.value,
    setValue: (value) => { this.value = value },
    changed: () => this.dispatchEvent(new Event('change')),
  })

  // The field is one line high, or two with its label; the editor sets the
  // rows from it.
  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.field'))
  }

  fillsSelf(): boolean {
    return this.lookup
  }

  checkOwnValue(): void {
    if (this.fillsSelf()) this._lookup.checkValue()
  }

  valueRequired(prop: string): boolean {
    return prop === 'value' && this.required && propertyVisible(NOT_CHECKBOX, { fieldType: this.fieldType })
  }

  focusValue(): void {
    this.renderRoot.querySelector<HTMLElement>('input, select')?.focus()
  }

  private onInput(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLSelectElement
    this.value = fromInput(fieldTypeOf(this.fieldType), target.value)
    this.typed = true
  }

  private onChange(): void {
    this.dispatchEvent(new Event('change'))
  }

  // What the operator typed in one visit counts once: on leaving the control
  // or on Enter, as the browser's own change of a text input does. A date
  // input on its own reports every finished segment.
  private onFocus(): void {
    this.valueAtFocus = this.value
    this.typed = false
  }

  private takeTyped(): void {
    if (this.typed && this.value !== this.valueAtFocus) this.onChange()
    this.onFocus()
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.takeTyped()
  }

  // In the mask a click anywhere on the field goes into it, also on the label
  // and beside the value.
  private onFieldClick(e: MouseEvent): void {
    if (this.preview) return
    const control = this.renderRoot.querySelector<HTMLElement>('input, select')
    if (!control || e.composedPath().includes(control)) return
    if (e.composedPath().some((at) => at instanceof HTMLButtonElement)) return
    control.focus()
  }

  // The label above the value, renamed by a double click in the editor.
  private labelTpl(): TemplateResult {
    return html`<span
      class="label"
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${this.label}</span>`
  }

  // A checkbox holds one of its two values in the field's value, as a text
  // field holds its text: the tick writes it, and the actions read it.
  private get ticked(): boolean {
    return this.value === this.checkedValue
  }

  private tick(on: boolean): void {
    this.value = on ? this.checkedValue : this.uncheckedValue
  }

  private onTextClick(): void {
    if (this.preview) return
    this.tick(!this.ticked)
    this.onChange()
  }

  // In the editor the value stands as text: a bound field shows the name of
  // its field there, dotted. In the mask the operator types into the control
  // while it shows the value: live writes only what differs from what the
  // control holds, so typing is never reset. A select lies invisible over the
  // whole field, so a click anywhere opens it, and its value stands as text.
  // A new select is given its value before its options exist, so the option
  // of the value comes selected; without a value the empty one is chosen,
  // hidden from the list but not disabled, or the browser would choose the
  // first entry.
  private controlTpl(kind: FieldType): TemplateResult {
    if (this.lookup) return this._lookup.render('ctrl', this.label)
    if (this.preview) return html`<span class="shown">${this.value}</span>`
    if (kind === 'select') {
      const entries = this.options.split(',').map((o) => o.trim()).filter((o) => o !== '')
      const foreignValue = this.value !== '' && !entries.includes(this.value)
      return html`<span class="shown">${this.value}</span><select
        class="ctrl"
        aria-label=${this.label}
        .value=${live(this.value)}
        @input=${this.onInput}
        @change=${this.onChange}
      >
        <option value="" hidden></option>
        ${foreignValue ? html`<option value=${this.value} hidden selected>${this.value}</option>` : nothing}
        ${entries.map((o) => html`<option value=${o} ?selected=${o === this.value}>${o}</option>`)}
      </select>`
    }
    return html`<input
      class="ctrl"
      type=${kind}
      aria-label=${this.label}
      .value=${live(forInput(kind, this.value))}
      @input=${this.onInput}
      @focus=${this.onFocus}
      @blur=${this.takeTyped}
      @keydown=${this.onKey}
    />`
  }

  // No tick is a value as well: an empty or foreign value reads as the
  // unticked one, also in an action before the box was ever clicked.
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (fieldTypeOf(this.fieldType) === 'checkbox' && !this.ticked) this.value = this.uncheckedValue
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)

    this.toggleAttribute('data-ff-list', this._lookup.hangsBelow)
  }

  // The box and the text beside it together are the spot bound to the field;
  // the text ticks the box as well.
  private checkboxTpl(bound: boolean): TemplateResult {
    return html`<div class=${classMap({ field: true, check: true, labelled: this.showLabel })}>
      <div
        class="row"
        data-ff-spot="value"
        ?data-ff-bound=${bound}
        @click=${this.reportSpot}
        @dblclick=${this.reportSpot}
      >
        ${tickBoxTpl(html`<input
          class="ctrl"
          type="checkbox"
          aria-label=${this.label}
          .checked=${live(this.ticked)}
          @input=${(e: Event) => this.tick((e.target as HTMLInputElement).checked)}
          @change=${this.onChange}
        />`)}
        ${this.showLabel
          ? html`<span
              class="text"
              data-ff-editable
              @click=${this.onTextClick}
              @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
            >${this.label}</span>`
          : nothing}
      </div>
    </div>`
  }

  override render(): TemplateResult {
    const kind = fieldTypeOf(this.fieldType)
    const valueBindable = !this.lookup
    const bound = valueBindable && this.valueField !== ''
    if (kind === 'checkbox') return this.checkboxTpl(bound)

    const empty = (valueBindable ? this.value : this._lookup.inField) === ''
    const sign = this.lookup ? undefined : SIGNS[kind]
    return html`<div
      class=${classMap({ field: true, labelled: this.showLabel, [`kind-${kind}`]: true, lookup: this.lookup, line: this.appearance !== 'plain' })}
      @click=${this.onFieldClick}
    >
      ${this.symbol !== '' ? html`<span class="symbol">${symbolTpl(this.symbol)}</span>` : nothing}
      ${this.showLabel ? this.labelTpl() : nothing}
      <div
        class=${classMap({ value: true, empty })}
        data-ff-spot=${valueBindable ? 'value' : nothing}
        ?data-ff-bound=${bound}
        @click=${this.reportSpot}
        @dblclick=${this.reportSpot}
      >
        ${this.controlTpl(kind)}
      </div>
      ${sign ? html`<span class="sign">${icon(sign)}</span>` : nothing}
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    connectValue(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    disconnectValue(this)
  }
}

defineBlock(FormField, {
  name: 'Feld',
  category: 'input',
  properties: formFieldProperties,
  capabilities: [
    { kind: 'source', when: { key: 'lookup', notEquals: true }, after: 'options' },
    { kind: 'followsSelection' },
    { kind: 'recordPick', sourceProp: 'lookupSource', when: ONLY_LOOKUP },
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
        titleProp: 'label',
        when: ONLY_LOOKUP,
      },
    },
    bindable<typeof formFieldProperties>([
      {
        prop: 'value',
        name: 'Wert',
        when: WITH_VALUE,
      },
    ]),
    actionValue<typeof formFieldProperties>([{ prop: 'value', name: 'Wert' }]),
    { kind: 'events', list: [{ key: 'onChange', name: 'Wert geändert' }] },
  ],
  grid: { startWidth: 12, startHeight: 3, minWidth: 4, heightFromContent: true },
  contracts: { actionValue: FormField },
})
