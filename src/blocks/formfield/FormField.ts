import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { actionValue, bindable, type ValueCarrier } from '../../core/block/capability'
import { propertyVisible } from '../../core/block/property'
import { LOOKUP_COLUMNS_BINDING } from '../lookup/lookup'
import { dayKey } from '../../runtime/chosenDay'
import { suggestionStyle } from '../lookup/suggestionList'
import { LookupControl } from '../lookup/lookupControl'
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

export interface FormField extends FormFieldValues {}

export class FormField extends BlockElement implements ValueCarrier {
  static readonly type = 'formfield'
  static readonly tag = 'ff-formfield'

  static override styles: CSSResultGroup = [BlockElement.styles, fieldStyle, suggestionStyle]

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
    this.value = fieldTypeOf(this.fieldType) === 'date' ? dateFromInput(target.value) : target.value
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

  // The label beside the box of a checkbox, which ticks it. A bound checkbox
  // shows the name of its field there.
  private textTpl(bound: boolean): TemplateResult {
    return html`<span
      class="text"
      ?data-ff-bound=${bound}
      data-ff-editable
      @click=${this.onTextClick}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${this.label}</span>`
  }

  // The label inside the empty field, where a placeholder stands. A bound
  // field shows the name of its field there.
  private placeholderTpl(bound: boolean): TemplateResult {
    return html`<span
      class="ph"
      ?data-ff-bound=${bound}
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

  // The operator types into the control while it shows the value: live writes
  // only what differs from what the control holds, so typing is never reset.
  private controlTpl(kind: FieldType): TemplateResult {
    if (this.lookup) return this._lookup.render('ctrl', this.label)
    if (kind === 'select') {
      const entries = this.options.split(',').map((o) => o.trim()).filter((o) => o !== '')
      const foreignValue = this.value !== '' && !entries.includes(this.value)
      return html`<select class="ctrl" .value=${live(this.value)} @input=${this.onInput} @change=${this.onChange}>
        <option value="" disabled hidden></option>
        ${foreignValue ? html`<option value=${this.value} hidden>${this.value}</option>` : nothing}
        ${entries.map((o) => html`<option value=${o}>${o}</option>`)}
      </select>`
    }
    return html`<input
      class="ctrl"
      type=${kind}
      .value=${live(kind === 'date' ? dateForInput(this.value) : this.value)}
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

  // The box and its label together are the spot bound to the field.
  private checkboxTpl(bound: boolean): TemplateResult {
    return html`<div class="field">
      <div
        class="row"
        data-ff-spot="value"
        @click=${this.reportSpot}
        @dblclick=${this.reportSpot}
      >
        <input
          class="ctrl"
          type="checkbox"
          .checked=${live(this.ticked)}
          @input=${(e: Event) => this.tick((e.target as HTMLInputElement).checked)}
          @change=${this.onChange}
        />
        ${this.textTpl(bound)}
      </div>
    </div>`
  }

  override render(): TemplateResult {
    const kind = fieldTypeOf(this.fieldType)
    const valueBindable = !this.lookup
    const bound = valueBindable && this.valueField !== ''
    if (kind === 'checkbox') return this.checkboxTpl(bound)

    const empty = (valueBindable ? this.value : this._lookup.inField) === ''
    const fieldClasses = `field${this.appearance === 'plain' ? ' plain' : ''}`
    return html`<div class=${fieldClasses}>
      <div
        class=${empty ? 'wrap empty' : 'wrap'}
        data-ff-spot=${valueBindable ? 'value' : nothing}
        ?data-ff-bound=${bound}
        @click=${this.reportSpot}
        @dblclick=${this.reportSpot}
      >
        ${this.controlTpl(kind)}
        ${empty ? this.placeholderTpl(bound) : nothing}
      </div>
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
        previewProp: 'label',
      },
    ]),
    actionValue<typeof formFieldProperties>([{ prop: 'value', name: 'Wert' }]),
    { kind: 'events', list: [{ key: 'onChange', name: 'Wert geändert' }] },
  ],
  grid: { startWidth: 12, startHeight: 2, minWidth: 4, heightFixed: true },
  contracts: { actionValue: FormField },
})
