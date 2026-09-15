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
  static readonly typ = 'trenner'
  static readonly tag = 'ff-trenner'
  static readonly anzeigeName = 'Trennlinie'
  static readonly kategorie: Kategorie = 'layout'
  static readonly vorgaben = STANDARD
  static readonly breiteAenderbar = true
  static readonly hoeheAenderbar = true
  static readonly raster = { startBreite: 48, startHoehe: 1, minBreite: 1, minHoehe: 1 }
  static override readonly eigenschaften: Eigenschaft[] = [
    { schluessel: 'richtung', name: 'Richtung', beschreibung: 'Die Linie waagerecht oder senkrecht ausrichten.',
      art: 'segment', optionen: [{ wert: 'waagerecht', name: 'Waagerecht' }, { wert: 'senkrecht', name: 'Senkrecht' }] },
    { schluessel: 'stil', name: 'Linienstil', beschreibung: 'Durchgezogen, gestrichelt oder gepunktet.',
      art: 'select', optionen: [{ wert: 'solid', name: 'Durchgezogen' }, { wert: 'dashed', name: 'Gestrichelt' }, { wert: 'dotted', name: 'Gepunktet' }] },
    { schluessel: 'staerke', name: 'Stärke', beschreibung: 'Dicke der Linie in Pixeln.', art: 'number', min: 1, max: 8, einheit: 'px' },
    { schluessel: 'farbe', name: 'Farbe', beschreibung: 'Farbe aus dem Design der Maske.', art: 'select',
      optionen: [{ wert: 'linie', name: 'Standard' }, { wert: 'dezent', name: 'Dezent' }, { wert: 'dunkel', name: 'Dunkel' }, { wert: 'akzent', name: 'Akzent' }] },
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
