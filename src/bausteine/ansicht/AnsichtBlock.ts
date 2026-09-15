// Baustein Ansicht: eine Seite der Maske, zwischen denen die Navi umschaltet.
import { css, html, type TemplateResult } from 'lit'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import { WURZEL_TYP } from '../../kern/maske/baum'

export class AnsichtBlock extends Grundbaustein {
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
    Grundbaustein.styles,

    css`

      :host { display: contents; }
    `,
  ]

  override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

Grundbaustein.defineAndRegister(AnsichtBlock)
