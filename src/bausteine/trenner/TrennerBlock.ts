import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'

const STANDARD = { width: 'fill', richtung: 'waagerecht', stil: 'solid', staerke: 1, farbe: 'linie' }
const FARBEN: Record<string, string> = {
  linie: 'var(--se-line)', dezent: 'var(--se-line-soft)', dunkel: 'var(--se-muted)', akzent: 'var(--se-accent)',
}

export class TrennerBlock extends Grundbaustein {
  static readonly blockType = 'trenner'
  static readonly tagName = 'ff-trenner'
  static readonly displayName = 'Trennlinie'
  static readonly category: Kategorie = 'layout'
  static readonly defaultProps = STANDARD
  static readonly resizableWidth = true
  static readonly resizableHeight = true
  static readonly raster = { startW: 48, startH: 1, minW: 1, minH: 1 }
  static override readonly customProperties: Eigenschaft[] = [
    { attributeName: 'richtung', name: 'Richtung', description: 'Die Linie waagerecht oder senkrecht ausrichten.',
      kind: 'segment', options: [{ value: 'waagerecht', label: 'Waagerecht' }, { value: 'senkrecht', label: 'Senkrecht' }] },
    { attributeName: 'stil', name: 'Linienstil', description: 'Durchgezogen, gestrichelt oder gepunktet.',
      kind: 'select', options: [{ value: 'solid', label: 'Durchgezogen' }, { value: 'dashed', label: 'Gestrichelt' }, { value: 'dotted', label: 'Gepunktet' }] },
    { attributeName: 'staerke', name: 'Stärke', description: 'Dicke der Linie in Pixeln.', kind: 'number', min: 1, max: 8, unit: 'px' },
    { attributeName: 'farbe', name: 'Farbe', description: 'Farbe aus dem Design der Maske.', kind: 'select',
      options: [{ value: 'linie', label: 'Standard' }, { value: 'dezent', label: 'Dezent' }, { value: 'dunkel', label: 'Dunkel' }, { value: 'akzent', label: 'Akzent' }] },
  ]
  static override styles = [Grundbaustein.styles, css`
    :host { height: 100%; min-height: 12px; }
    .flaeche { height: 100%; min-height: inherit; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .linie { box-sizing: border-box; width: 100%; border-top: var(--strich-breite) var(--strich-stil) var(--strich-farbe); }
    .senkrecht .linie { width: 0; height: 100%; border-top: 0; border-left: var(--strich-breite) var(--strich-stil) var(--strich-farbe); }
  `]
  @property() richtung = STANDARD.richtung
  @property() stil = STANDARD.stil
  @property({ type: Number }) staerke = STANDARD.staerke
  @property() farbe = STANDARD.farbe

  override render(): TemplateResult {
    const senkrecht = this.richtung === 'senkrecht'
    const staerke = Number.isFinite(this.staerke) ? Math.min(8, Math.max(1, this.staerke)) : STANDARD.staerke
    return html`<div class="flaeche ${senkrecht ? 'senkrecht' : ''}" role="separator"
      aria-orientation=${senkrecht ? 'vertical' : 'horizontal'}
      style=${styleMap({
        '--strich-breite': `${staerke}px`,
        '--strich-stil': ['solid', 'dashed', 'dotted'].includes(this.stil) ? this.stil : STANDARD.stil,
        '--strich-farbe': FARBEN[this.farbe] ?? FARBEN.linie,
      })}><div class="linie"></div></div>`
  }
}
Grundbaustein.defineAndRegister(TrennerBlock)
