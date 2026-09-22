import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { Capability } from '../../core/block/capability'
import { onChosenDay, chosenDay, setChosenDay } from '../behavior/chosenDay'
import { dateStyle } from './datePickerStyle'

function tagOf(moment: Date): string {
  const month = String(moment.getMonth() + 1).padStart(2, '0')
  const tag = String(moment.getDate()).padStart(2, '0')
  return `${moment.getFullYear()}-${month}-${tag}`
}

function tagPlus(key: string, days: number): string {
  const pieces = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!pieces) return ''
  const moment = new Date(Number(pieces[1]), Number(pieces[2]) - 1, Number(pieces[3]))
  moment.setDate(moment.getDate() + days)
  return tagOf(moment)
}

export class DatePicker extends BlockElement {
  static readonly type = 'date'
  static readonly tag = 'ff-date'
  static readonly displayName = 'Datum'
  static readonly category: Category = 'display'

  static readonly capabilities: readonly Capability[] = []

  static readonly grid = { startWidth: 18, startHeight: 2, minWidth: 10, minHeight: 2 }

  static override styles: CSSResultGroup = [BlockElement.styles, dateStyle]

  @state() private tag = ''

  private unlistenDay: (() => void) | null = null

  private setTag(next: string): void {
    setChosenDay(next)
    this.tag = chosenDay()
  }

  override render(): TemplateResult {
    return html`<div class="waehler">
      <div class="riegel">
        <button class="pfeil" title="Vortag" @click=${() => this.setTag(tagPlus(this.tag, -1))}>‹</button>
        <input
          class="feld"
          type="date"
          .value=${this.tag}
          @change=${(e: Event) => this.setTag((e.target as HTMLInputElement).value)}
        />
        <button class="pfeil" title="Folgetag" @click=${() => this.setTag(tagPlus(this.tag, 1))}>›</button>
      </div>
      <button class="heute" @click=${() => this.setTag(tagOf(new Date()))}>Heute</button>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()

    this.tag = chosenDay() || tagOf(new Date())
    if (this.inEditor) return
    this.setTag(this.tag)

    this.unlistenDay?.()
    this.unlistenDay = onChosenDay(() => { this.tag = chosenDay() })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unlistenDay?.()
    this.unlistenDay = null
  }
}

BlockElement.defineAndRegister(DatePicker)
