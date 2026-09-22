import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { Capability } from '../../core/block/capability'
import { areaStyle } from './areaStyle'

export class Area extends BlockElement {
  static readonly type = 'area'
  static readonly tag = 'ff-area'
  static readonly displayName = 'Bereich'
  static readonly category: Category = 'layout'

  static readonly capabilities: readonly Capability[] = []

  static readonly takesChildren = true
  static readonly gridArea = true

  static readonly containerFrame = false

  static readonly widthEditable = true
  static readonly heightEditable = true

  static readonly grid = { startWidth: 24, startHeight: 12, minWidth: 4, minHeight: 3 }

  static override styles: CSSResultGroup = [BlockElement.styles, areaStyle]

  override render(): TemplateResult {
    return html`<div class="rumpf"><slot></slot></div>`
  }
}

BlockElement.defineAndRegister(Area)
