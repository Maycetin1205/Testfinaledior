import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { actionValue, bindable } from '../../core/block/capability'
import { coerceLookupColumns, LOOKUP_COLUMNS_BINDING } from '../lookup/lookup'
import { readDate, dayKey } from '../../runtime/chosenDay'
import { suggestionStyle } from '../lookup/suggestionList'
import { LookupControl } from '../lookup/lookupControl'
// The lookup window draws its rows with the table block.
import '../table/Table'
import { disconnectValue, connectValue } from './valueBinding'
import { fieldStyle } from './formFieldStyle'
import {
  FIELD_TYPES,
  ONLY_LOOKUP,
  WITHOUT_VALUE,
  formFieldProperties,
  type FieldType,
  type FormFieldValues,
} from './properties'

function fieldTypeOf(v: unknown): FieldType {
  return FIELD_TYPES.includes(v as FieldType) ? (v as FieldType) : 'text'
}

function dateForInput(value: string): string {
  return dayKey(value) || value
}

function dateFromInput(value: string): string {
  const date = readDate(value)
  if (!date) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}

export interface FormField extends FormFieldValues {}

export class FormField extends BlockElement {
  static readonly type = 'formfield'
  static readonly tag = 'ff-formfield'

  static override styles: CSSResultGroup = [BlockElement.styles, fieldStyle, suggestionStyle]

  @state() private ticked = false

  private readonly _lookup = new LookupControl({
    block: this,
    report: () => this.requestUpdate(),
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

  // The label beside the box of a checkbox, which ticks it.
  private textTpl(): TemplateResult {
    return html`<span
      class="text"
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

  private onTextClick(): void {
    if (this.preview) return
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
          ${entries.map((o) => html`<option value=${o}>${o}</option>`)}
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
        />`
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)

    this.toggleAttribute('data-ff-list', this._lookup.hangsBelow)
  }

  override render(): TemplateResult {
    const kind = fieldTypeOf(this.fieldType)
    if (kind === 'checkbox') {
      return html`<div class="field">
        <div class="row">
          <input
            class="ctrl"
            type="checkbox"
            .checked=${this.ticked}
            @change=${(e: Event) => this.setTick((e.target as HTMLInputElement).checked)}
          />
          ${this.textTpl()}
        </div>
      </div>`
    }

    const valueBindable = kind !== 'lookup'
    const bound = valueBindable && this.valueField !== ''
    const empty = (valueBindable ? this.value : this._lookup.inField) === ''
    const fieldClasses = `field${this.appearance === 'plain' ? ' plain' : ''}`
    return html`<div class=${fieldClasses}>
      <div
        class=${empty ? 'wrap empty' : 'wrap'}
        data-ff-spot=${valueBindable ? 'value' : nothing}
        ?data-ff-bound=${bound}
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
    { kind: 'source', when: { key: 'fieldType', notEquals: 'lookup' } },
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
        spot: '.magnifier',
        when: ONLY_LOOKUP,
      },
    },
    bindable<typeof formFieldProperties>([
      {
        prop: 'value',
        name: 'Wert',
        when: { key: 'fieldType', noneOf: WITHOUT_VALUE },
        previewProp: 'label',
      },
    ]),
    actionValue<typeof formFieldProperties>([{ prop: 'value', name: 'Wert' }]),
    { kind: 'events', list: [{ key: 'onChange', name: 'Wert geändert' }] },
  ],
  grid: { startWidth: 12, startHeight: 2, minWidth: 4, minHeight: 2 },
})
