import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { onChosenDay, chosenDay, setChosenDay, readDate, dayOf } from '../../runtime/chosenDay'
import { dateStyle } from './datePickerStyle'
import { icon } from '../parts/icons'

function dayPlus(key: string, days: number): string {
  const moment = readDate(key)
  if (!moment) return ''
  moment.setDate(moment.getDate() + days)
  return dayOf(moment)
}

export class DatePicker extends BlockElement {
  static readonly type = 'date'
  static readonly tag = 'ff-date'

  static override styles: CSSResultGroup = [BlockElement.styles, dateStyle]

  @state() private day = ''

  private unlistenDay: (() => void) | null = null

  private setDay(value: string): void {
    setChosenDay(value)
    this.day = chosenDay()
  }

  override render(): TemplateResult {
    return html`<div class="picker">
      <div class="stepper">
        <button class="arrow" title="Vortag" aria-label="Vortag" @click=${() => this.setDay(dayPlus(this.day, -1))}>${icon('caretLeft')}</button>
        <input
          class="field"
          type="date"
          .value=${this.day}
          @change=${(e: Event) => this.setDay((e.target as HTMLInputElement).value)}
        />
        <button class="arrow" title="Folgetag" aria-label="Folgetag" @click=${() => this.setDay(dayPlus(this.day, 1))}>${icon('caretRight')}</button>
      </div>
      <button class="today" @click=${() => this.setDay(dayOf(new Date()))}>Heute</button>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()

    this.day = chosenDay() || dayOf(new Date())
    if (this.preview) return
    this.setDay(this.day)

    this.unlistenDay?.()
    this.unlistenDay = onChosenDay(() => { this.day = chosenDay() })
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
  grid: { startWidth: 18, startHeight: 2, minWidth: 10, heightFixed: true },
})
