// Baustein Navi-Eintrag: ein Punkt der Navi, der auf eine Ansicht zeigt.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { SEITEN_WECHSEL_EVENT, type SeitenWechselDetail } from '../../kern/maske/seitenWechsel'
import {
  coerceStatusVariant,
  farbweltStil,
  statusVariantProperty,
} from '../shared/statusVariant'

export class NaviEintragBlock extends Grundbaustein {
  static readonly blockType = 'navi-eintrag'
  static readonly tagName = 'ff-navi-eintrag'
  static readonly displayName = 'Navi-Eintrag'
  static readonly category: Kategorie = 'layout'
  static readonly acceptsChildren = false
  static readonly showInPalette = false
  static readonly allowedParentTypes = ['navi']
  static readonly resizableWidth = false
  static readonly defaultProps = {
    seite: '',
    seitename: '',
    ton: 'info',
  }

  static override readonly customProperties: Eigenschaft[] = [
    {
      attributeName: 'seite',
      name: 'Seite',
      description: 'Welche Seite dieser Maske der Eintrag zeigt.',
      kind: 'seite',
      klarnameProp: 'seitename',
    },
    statusVariantProperty('ton', 'Farbe des Zeichens vor dem Namen.', 'Farbe'),
  ]

  static override styles = [
    Grundbaustein.styles,
    farbweltStil,
    css`
      :host { display: block; margin: 2px 6px; }
      button {
        display: flex;
        width: 100%;
        border: 0;
        background: transparent;
        text-align: left;
        align-items: center;
        gap: 13px;
        box-sizing: border-box;
        padding: 10px 11px;
        border-radius: var(--se-r-md);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 600;
        color: var(--se-bg);
        white-space: nowrap;
        cursor: pointer;
      }
      button:hover { background: var(--se-muted); }

      :host([aktiv]) button { background: var(--se-accent); color: var(--se-panel); }

      button:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
      button:disabled { opacity: .5; cursor: not-allowed; }

      .zeichen {
        width: 22px;
        height: 22px;
        flex: none;
        border-radius: 50%;
        background: var(--fw-stark);
        display: grid;
        place-items: center;
        color: var(--se-panel);
        font-size: var(--se-fs-xs);
      }
      :host([aktiv]) .zeichen { background: var(--se-panel); color: var(--se-accent); }

      .name { display: none; }
      :host([breit]) .name {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ]

  @property() seite = ''
  @property() seitename = ''
  @property() ton = 'info'

  @property({ type: Boolean }) aktiv = false
  @property({ type: Boolean }) ungueltig = false

  private melde(): void {
    if (this.imEditor) return
    const detail: SeitenWechselDetail = { seite: this.seite }
    this.dispatchEvent(new CustomEvent<SeitenWechselDetail>(SEITEN_WECHSEL_EVENT, {
      detail,
      bubbles: true,
      composed: true,
    }))
  }

  override render(): TemplateResult {
    const name = this.seitename || 'Seite wählen'
    return html`<button type="button" @click=${() => this.melde()}
      aria-label=${name} aria-current=${this.aktiv ? 'page' : 'false'}
      title=${this.ungueltig ? `${name}: Zielseite fehlt` : name}
      ?disabled=${!this.imEditor && this.ungueltig}>
      <span aria-hidden="true" class="zeichen v-${coerceStatusVariant(this.ton)}">${name.slice(0, 2).toLocaleUpperCase('de-DE')}</span>
      <span class="name">${name}</span>
    </button>`
  }
}

Grundbaustein.defineAndRegister(NaviEintragBlock)
