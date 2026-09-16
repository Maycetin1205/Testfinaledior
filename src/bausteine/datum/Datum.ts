// Baustein Datum: waehlt den Tag, den die Maske zeigt.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { aufTagHoeren, gewaehlterTag, setzeGewaehltenTag } from '../faehigkeiten/gewaehlterTag'
import { datumStil } from './datumStil'

// In Tagen rechnet nur der Waehler: der Tag der Maske kennt kein Vor und Zurueck,
// er kennt nur seinen Stand.
function tagVon(zeitpunkt: Date): string {
  const monat = String(zeitpunkt.getMonth() + 1).padStart(2, '0')
  const tag = String(zeitpunkt.getDate()).padStart(2, '0')
  return `${zeitpunkt.getFullYear()}-${monat}-${tag}`
}

function tagPlus(schluessel: string, tage: number): string {
  const stuecke = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schluessel)
  if (!stuecke) return ''
  const zeitpunkt = new Date(Number(stuecke[1]), Number(stuecke[2]) - 1, Number(stuecke[3]))
  zeitpunkt.setDate(zeitpunkt.getDate() + tage)
  return tagVon(zeitpunkt)
}

export class Datum extends Grundbaustein {
  static readonly typ = 'datum'
  static readonly tag = 'ff-datum'
  static readonly anzeigeName = 'Datum'
  static readonly kategorie: Kategorie = 'anzeige'

  // Der gewaehlte Tag gehoert der ganzen Maske und keinem Baustein: er steht in
  // keiner Eigenschaft, reist in keinem Export mit und wird nicht gebunden.
  static readonly faehigkeiten: readonly Faehigkeit[] = []

  static readonly vorgaben = {}

  static override readonly eigenschaften: Eigenschaft[] = []

  static readonly raster = { startBreite: 18, startHoehe: 2, minBreite: 10, minHoehe: 2 }

  static override styles: CSSResultGroup = [Grundbaustein.styles, datumStil]

  @state() private tag = ''

  private tagAbmelden: (() => void) | null = null

  // Erst setzen, dann zurueckfragen: was der Waehler zeigt, ist der Stand der
  // Maske, nicht das Getippte.
  private setzeTag(neu: string): void {
    setzeGewaehltenTag(neu)
    this.tag = gewaehlterTag()
  }

  override render(): TemplateResult {
    return html`<div class="waehler">
      <div class="riegel">
        <button class="pfeil" title="Vortag" @click=${() => this.setzeTag(tagPlus(this.tag, -1))}>‹</button>
        <input
          class="feld"
          type="date"
          .value=${this.tag}
          @change=${(e: Event) => this.setzeTag((e.target as HTMLInputElement).value)}
        />
        <button class="pfeil" title="Folgetag" @click=${() => this.setzeTag(tagPlus(this.tag, 1))}>›</button>
      </div>
      <button class="heute" @click=${() => this.setzeTag(tagVon(new Date()))}>Heute</button>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()

    this.tag = gewaehlterTag() || tagVon(new Date())
    if (this.imEditor) return
    this.setzeTag(this.tag)

    this.tagAbmelden?.()
    this.tagAbmelden = aufTagHoeren(() => { this.tag = gewaehlterTag() })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.tagAbmelden?.()
    this.tagAbmelden = null
  }
}

Grundbaustein.defineAndRegister(Datum)
