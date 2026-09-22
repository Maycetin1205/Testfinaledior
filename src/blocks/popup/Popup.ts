import { html, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { numberProperty, textProperty } from '../../core/block/property'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { Capability } from '../../core/block/capability'
import { ROOT_TYPE } from '../../core/block/tree'
import '../behavior/DialogFrame'
import { popupStyle } from './popupStyle'

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

export class Popup extends BlockElement {
  static readonly type = 'popup'
  static readonly tag = 'ff-popup'
  static readonly displayName = 'Popup'
  static readonly category: Category = 'layout'

  static readonly capabilities: readonly Capability[] = []

  static readonly takesChildren = true
  static readonly inPalette = false
  static readonly allowedParent = [ROOT_TYPE]
  static readonly page = true
  static readonly widthEditable = false
  static readonly containerFrame = false

  static readonly blockProperties = {
    name: textProperty({
      default: 'Popup',
      label: 'Name',
      help: 'Unter diesem Namen rufen Aktionen das Popup auf.',
      place: 'block',
      attribute: 'name',
    }),
    popupWidth: numberProperty({
      default: 520,
      label: 'Breite',
      help: 'Breite des Popups in Pixeln.',
      place: 'none',
      attribute: 'popupwidth',
    }),
    popupHeight: numberProperty({
      default: 380,
      label: 'Höhe',
      help: 'Höhe des Popups in Pixeln.',
      place: 'none',
      attribute: 'popupheight',
    }),
  }

  static override styles: CSSResultGroup = [BlockElement.styles, popupStyle]

  name = 'Popup'
  popupWidth = 520
  popupHeight = 380

  @property({ type: Boolean, reflect: true }) open = false

  private closeWindow(): void {
    if (this.inEditor) return
    this.removeAttribute('open')
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    if (!changed.has('open') || !this.open || this.inEditor) return
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
        ?escape-closes=${this.open && !this.inEditor}
        @ff-dialog-close=${this.closeWindow}
      >
        <span
          slot="title"
          class="titel"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'name')}
        >${this.name}</span>
        <div class="rumpf"><slot></slot></div>
      </ff-dialog>`
  }
}

BlockElement.defineAndRegister(Popup)
