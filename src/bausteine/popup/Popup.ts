// Baustein Popup: eine Seite der Maske, die als Fenster ueber ihr aufgeht.
import { html, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { WURZEL_TYP } from '../../kern/maske/baum'
import '../faehigkeiten/DialogRahmen'
import { popupStil } from './popupStil'

const FOKUSSIERBAR = 'input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])'

// Auch durch die Schatten hindurch: jeder Baustein haelt seine Eingabestelle im
// eigenen shadowRoot, und querySelectorAll sieht dort nicht hinein.
function ersteFokusStelle(wurzel: ParentNode): HTMLElement | null {
  for (const el of Array.from(wurzel.querySelectorAll('*'))) {
    if (el instanceof HTMLElement && el.matches(FOKUSSIERBAR) && !el.hasAttribute('disabled')) {
      return el
    }
    const tiefer = el.shadowRoot ? ersteFokusStelle(el.shadowRoot) : null
    if (tiefer) return tiefer
  }
  return null
}

export class Popup extends Grundbaustein {
  static readonly typ = 'popup'
  static readonly tag = 'ff-popup'
  static readonly anzeigeName = 'Popup'
  static readonly kategorie: Kategorie = 'layout'

  // Keine. Das Fenster traegt nur, was in ihm liegt: es liest keine Quelle,
  // fuehrt keine Liste und hat kein eigenes Ereignis. Aufgemacht wird es von
  // der Kette eines anderen Bausteins (POPUP_OPEN).
  static readonly faehigkeiten: readonly Faehigkeit[] = []

  static readonly nimmtKinder = true
  static readonly inPalette = false
  static readonly erlaubteEltern = [WURZEL_TYP]
  static readonly seite = true
  static readonly breiteAenderbar = false
  static readonly behaelterRahmen = false

  // `name` ist der Name der SEITE, kein Wort dieses Bausteins: kern/maske/seiten.ts
  // liest ihn an jedem Seiten-Baustein, und eine Kette ruft das Fenster damit.
  static readonly vorgaben = { name: 'Popup', breite: 520, hoehe: 380 }

  static override styles: CSSResultGroup = [Grundbaustein.styles, popupStil]

  @property() name = 'Popup'
  @property() breite: number | string = 520
  @property() hoehe: number | string = 380

  @property({ type: Boolean, reflect: true }) offen = false

  private schliesseFenster(): void {
    if (this.imEditor) return
    this.removeAttribute('offen')
  }

  // Ohne diesen Sprung tippt der Bediener ins offene Fenster und nichts nimmt
  // es an; hat das Fenster keine eigene Eingabestelle, faengt Schliessen ihn.
  protected override updated(geaendert: PropertyValues<this>): void {
    super.updated(geaendert)
    if (!geaendert.has('offen') || !this.offen || this.imEditor) return
    void this.updateComplete.then(() => {
      if (!this.offen || !this.isConnected) return
      const ziel = ersteFokusStelle(this)
        ?? (this.shadowRoot ? ersteFokusStelle(this.shadowRoot) : null)
      ziel?.focus()
    })
  }

  override render(): TemplateResult {
    return html`<ff-dialog-rahmen
        .breite=${this.breite}
        .hoehe=${this.hoehe}
        ?escape-schliesst=${this.offen && !this.imEditor}
        @ff-dialog-schliessen=${this.schliesseFenster}
      >
        <span
          slot="titel"
          class="titel"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'name')}
        >${this.name}</span>
        <div class="rumpf"><slot></slot></div>
      </ff-dialog-rahmen>`
  }
}

Grundbaustein.defineAndRegister(Popup)
