// Baustein Ansicht: eine Seite der Maske, zwischen denen die Navi umschaltet.
import { css, html, type TemplateResult } from 'lit'
import { BasicBlock } from '../base/BasicBlock'
import type { Kategorie } from '../../core/blocks/BlockComponent'
import { WURZEL_TYP } from '../../core/blocks/BlockData'

export class AnsichtBlock extends BasicBlock {
  static readonly blockType = 'ansicht'
  static readonly tagName = 'ff-ansicht'
  static readonly displayName = 'Ansicht'
  static readonly category: Kategorie = 'layout'
  static readonly acceptsChildren = true

  static readonly showInPalette = false
  static readonly allowedParentTypes = [WURZEL_TYP]
  static readonly pageBlock = true
  static readonly flaechenSeite = true

  static readonly defaultProps = {
    name: 'Ansicht',
  }

  static override styles = [
    BasicBlock.styles,

    css`

      :host { display: contents; }
    `,
  ]

  override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

BasicBlock.defineAndRegister(AnsichtBlock)
