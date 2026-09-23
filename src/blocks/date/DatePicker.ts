import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { onChosenDay, chosenDay, setChosenDay, readDate, tagOf } from '../behavior/chosenDay'
import { dateStyle } from './datePickerStyle'

function tagPlus(key: string, days: number): string {
  const moment = readDate(key)
  if (!moment) return ''
  moment.setDate(moment.getDate() + days)
  return tagOf(moment)
}

export class DatePicker extends BlockElement {
  static readonly type = 'date'
  static readonly tag = 'ff-date'

  static override styles: CSSResultGroup = [BlockElement.styles, dateStyle]

  @state() private tag = ''

  private unlistenDay: (() => void) | null = null

  private setTag(next: string): void {
    setChosenDay(next)
    this.tag = chosenDay()
  }

  override render(): TemplateResult {
    return html`<div class="picker">
      <div class="stepper">
        <button class="arrow" title="Vortag" @click=${() => this.setTag(tagPlus(this.tag, -1))}>‹</button>
        <input
          class="field"
          type="date"
          .value=${this.tag}
          @change=${(e: Event) => this.setTag((e.target as HTMLInputElement).value)}
        />
        <button class="arrow" title="Folgetag" @click=${() => this.setTag(tagPlus(this.tag, 1))}>›</button>
      </div>
      <button class="today" @click=${() => this.setTag(tagOf(new Date()))}>Heute</button>
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

defineBlock(DatePicker, {
  name: 'Datum',
  category: 'display',
  grid: { startWidth: 18, startHeight: 2, minWidth: 10, minHeight: 2 },
})
