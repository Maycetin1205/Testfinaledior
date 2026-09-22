import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { actionValue, bindable } from '../../core/block/capability'
import { coerceLookupColumns, LOOKUP_COLUMNS_BINDING } from '../behavior/lookup'
import { suggestionStyle } from '../behavior/suggestionList'
import { LookupControl } from './lookupControl'
import {
  NOT_READ,
  valueDisconnected,
  valueReason,
  valueRegistered,
  type ValueReport,
} from './valueBinding'
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

const WITH_PLACEHOLDER: readonly FieldType[] = [
  'text', 'number', 'textarea', 'select', 'lookup', 'date', 'time',
]

const PH_CLASS: Partial<Record<FieldType, string>> = {
  select: 'ph-select',
  date: 'ph-nativ',
  time: 'ph-nativ',
  lookup: 'ph-lookup',
}

function dateForInput(value: string): string {
  const german = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  return german ? `${german[3]}-${german[2]}-${german[1]}` : value
}

function dateFromInput(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : value
}

export interface FormField extends FormFieldValues {}

export class FormField extends BlockElement {
  static readonly type = 'formfield'
  static readonly tag = 'ff-formfield'

  static override styles: CSSResultGroup = [BlockElement.styles, fieldStyle, suggestionStyle]

  // What the last read of the bound field found; the binding fills it in.
  @property({ attribute: false }) valueReport: ValueReport = NOT_READ

  @state() private ticked = false

  @state() private inControl = false

  private readonly _lookup = new LookupControl({
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

  // The empty field either names the reason it read nothing or offers its
  // label; both stand in the same spot.
  private placeholderTpl(kind: FieldType, empty: boolean, reason: string): TemplateResult {
    if (reason !== '') {
      return html`<span class="ph grund" role="status" title=${reason}>${reason}</span>`
    }
    return this.textTpl(
      `ph ${PH_CLASS[kind] ?? ''}`.trim(),
      !empty,
      kind !== 'lookup' && this.valueField !== '',
    )
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this._lookup.dragTo()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)

    this.toggleAttribute('data-ff-list', this._lookup.hangsBelow)
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
    const reason = empty && valueBindable && !this.inEditor
      ? valueReason(this.valueReport, this.source, this.valueField)
      : ''
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
          ? this.placeholderTpl(kind, empty, reason)
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

defineBlock(FormField, {
  name: 'Formularfeld',
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
        automatic: 'Ohne Spalten zeigt das Fenster eine: das gespeicherte Feld.'
          + ' Die erste Spalte ist, was nach der Wahl im Feld steht.',
        spot: '.lupe',
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
