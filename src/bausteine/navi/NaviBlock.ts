// Baustein Navi: die Leiste, die zwischen den Ansichten der Maske umschaltet.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { WURZEL_ID, WURZEL_TYP } from '../../kern/maske/baum'
import { RAND } from '../../kern/maske/maskenRand'
import { NaviEintragBlock } from './NaviEintragBlock'
import { naviAktualisiert, trenneNavi, verbindeNavi, zeigeBreite } from './seRuntime'

const EINTRAG = NaviEintragBlock.typ

export class NaviBlock extends Grundbaustein {
  static readonly typ = 'navi'
  static readonly tag = 'ff-navi'
  static readonly anzeigeName = 'Navigation'
  static readonly kategorie: Kategorie = 'layout'
  static readonly nimmtKinder = true
  static readonly erlaubteKinder = [EINTRAG]
  static readonly kindKnopf = { label: 'Eintrag', childType: EINTRAG }
  static readonly behaelterRahmen = false
  static readonly vorgaben = {}
  static readonly kinderVorgabe = [
    { typ: EINTRAG, werte: { seite: WURZEL_ID, seitename: 'Hauptseite' } },
  ]
  static override readonly eigenschaften: Eigenschaft[] = []

  static readonly maskenRand = true

  static readonly erlaubteEltern = [WURZEL_TYP]

  static override styles = [
    Grundbaustein.styles,
    css`
      :host {
        height: 100%;
        width: ${RAND.breite}px;
        transition: width var(--se-move);
      }
      :host([offen]) { width: ${RAND.breiteOffen}px; }
      .leiste {
        box-sizing: border-box;
        height: 100%;
        width: 100%;
        background: var(--se-ink);
        color: var(--se-bg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: var(--se-font);
      }
      :host([offen]) .leiste {
        background: color-mix(in oklab, var(--se-ink) 88%, transparent);
      }

      .kopf {
        flex: none;
        display: flex;
        align-items: center;
        padding: 8px;
      }
      .schalter {
        flex: none;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        width: 40px;
        height: 32px;
        padding: 0 11px;
        border: none;
        border-radius: var(--se-r-md);
        background: none;
        color: inherit;
        cursor: pointer;
      }
      .schalter:hover { background: var(--se-muted); }
      .balken {
        height: 2px;
        background: currentColor;
      }
      .eintraege {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px 0;
        overflow-y: auto;
      }
      .eintraege slot { display: contents; }
    `,
  ]

  @property({ type: Boolean, reflect: true }) offen = false

  override connectedCallback(): void {
    super.connectedCallback()
    verbindeNavi(this)
  }

  override disconnectedCallback(): void {
    trenneNavi(this)
    super.disconnectedCallback()
  }

  private klappen(): void {
    this.toggleAttribute('offen')
    zeigeBreite(this)
  }

  override render(): TemplateResult {
    return html`<nav class="leiste" aria-label="Seiten">
        <div class="kopf">
          <button
            class="schalter"
            type="button"
            aria-label="Navigation auf- und zuklappen"
            aria-expanded=${String(this.offen)}
            @click=${() => this.klappen()}
          >
            <span class="balken"></span>
            <span class="balken"></span>
            <span class="balken"></span>
          </button>
        </div>
        <div class="eintraege">
          <slot @slotchange=${() => naviAktualisiert(this)}></slot>
        </div>
      </nav>`
  }
}

Grundbaustein.defineAndRegister(NaviBlock)
