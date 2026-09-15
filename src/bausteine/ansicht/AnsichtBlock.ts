// Baustein Ansicht: eine Seite der Maske, zwischen denen die Navi umschaltet.
import { css, html, type TemplateResult } from 'lit'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import { WURZEL_TYP } from '../../kern/maske/baum'

export class AnsichtBlock extends Grundbaustein {
  static readonly typ = 'ansicht'
  static readonly tag = 'ff-ansicht'
  static readonly anzeigeName = 'Ansicht'
  static readonly kategorie: Kategorie = 'layout'
  static readonly nimmtKinder = true

  static readonly inPalette = false
  static readonly erlaubteEltern = [WURZEL_TYP]
  static readonly seite = true
  static readonly flaechenSeite = true

  static readonly vorgaben = {
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
