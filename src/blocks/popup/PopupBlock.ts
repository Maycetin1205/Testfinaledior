// Baustein Popup: eine Flaeche, die als Fenster ueber der Maske aufgeht.
import { css, html, unsafeCSS, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BasicBlock } from '../base/BasicBlock'
import type { Kategorie } from '../../core/blocks/BlockComponent'
import { WURZEL_TYP } from '../../core/blocks/BlockData'
import { rasterFlaecheCss } from '../../core/blocks/rasterLayout'

const FOKUSSIERBAR = 'input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])'

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

import '../shared/DialogRahmen'

export class PopupBlock extends BasicBlock {
  static readonly blockType = 'popup'
  static readonly tagName = 'ff-popup'
  static readonly displayName = 'Popup'
  static readonly category: Kategorie = 'layout'
  static readonly acceptsChildren = true

  static readonly showInPalette = false
  static readonly allowedParentTypes = [WURZEL_TYP]
  static readonly pageBlock = true

  static readonly resizableWidth = false
  static readonly containerHint = false
  static readonly defaultProps = {
    name: 'Popup',
    breite: 520,
    hoehe: 380,
  }

  static override styles = [
    BasicBlock.styles,
    css`

      :host { display: none; }
      :host([offen]),
      :host([data-ff-editor]) {
        display: block;
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 10;
        font-family: var(--se-font);
      }

      .titel {
        display: block;
        min-height: 1.4em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .rumpf {
        box-sizing: border-box;
        height: 100%;
        overflow: auto;
        padding: 12px;
        ${unsafeCSS(rasterFlaecheCss())};
      }

      .rumpf slot { display: contents; }
    `,
  ]

  @property() name = 'Popup'
  @property() breite: number | string = 520
  @property() hoehe: number | string = 380

  @property({ type: Boolean, reflect: true }) offen = false

  private onClose(): void {
    if (this.imEditor) return
    this.removeAttribute('offen')
  }

  protected override updated(geaendert: PropertyValues<this>): void {
    super.updated(geaendert)
    if (!geaendert.has('offen') || !this.offen) return
    if (this.imEditor) return

    void this.updateComplete.then(() => {
      if (!this.offen || !this.isConnected) return
      const ziel = ersteFokusStelle(this) ?? (this.shadowRoot ? ersteFokusStelle(this.shadowRoot) : null)
      ziel?.focus()
    })
  }

  override render(): TemplateResult {
    return html`<ff-dialog-rahmen
        .breite=${this.breite}
        .hoehe=${this.hoehe}
        ?escape-schliesst=${this.offen && !this.imEditor}
        @ff-dialog-schliessen=${this.onClose}
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

BasicBlock.defineAndRegister(PopupBlock)
