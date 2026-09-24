import { html, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { ROOT_TYPE } from '../../core/block/tree'
import '../dialog/DialogFrame'
import { popupStyle } from './popupStyle'
import { popupProperties, type PopupValues } from './properties'

const FOCUSABLE = 'input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])'

function firstFocusSpot(root: ParentNode): HTMLElement | null {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el instanceof HTMLElement && el.matches(FOCUSABLE) && !el.hasAttribute('disabled')) {
      return el
    }
    const deeper = el.shadowRoot ? firstFocusSpot(el.shadowRoot) : null
    if (deeper) return deeper
  }
  return null
}

export interface Popup extends PopupValues {}

export class Popup extends BlockElement {
  static readonly type = 'popup'
  static readonly tag = 'ff-popup'

  static override styles: CSSResultGroup = [BlockElement.styles, popupStyle]

  @property({ type: Boolean, reflect: true }) open = false

  private closeWindow(): void {
    this.removeAttribute('open')
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    if (!changed.has('open') || !this.open) return
    void this.updateComplete.then(() => {
      if (!this.open || !this.isConnected) return
      const target = firstFocusSpot(this)
        ?? (this.shadowRoot ? firstFocusSpot(this.shadowRoot) : null)
      target?.focus()
    })
  }

  override render(): TemplateResult {
    return html`<ff-dialog
        .width=${this.popupWidth}
        .height=${this.popupHeight}
        ?escape-closes=${this.open}
        @ff-dialog-close=${this.closeWindow}
      >
        <span
          slot="title"
          class="title"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'name')}
        >${this.name}</span>
        <div class="body"><slot></slot></div>
      </ff-dialog>`
  }
}

defineBlock(Popup, {
  name: 'Popup',
  category: 'layout',
  properties: popupProperties,
  takesChildren: true,
  inPalette: false,
  allowedParent: [ROOT_TYPE],
  page: true,
  containerFrame: false,
})
