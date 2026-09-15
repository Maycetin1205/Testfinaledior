import { css, html, type TemplateResult } from 'lit'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'

export class KanbanMusterBlock extends Grundbaustein {
  static readonly typ = 'kanban-muster'
  static readonly tag = 'ff-kanban-muster'
  static readonly anzeigeName = 'Kartenmuster'
  static readonly kategorie: Kategorie = 'anzeige'
  static readonly nimmtKinder = true
  static readonly erlaubteKinder = ['card']
  static readonly erlaubteEltern = ['kanban']
  static readonly inPalette = false
  static readonly breiteAenderbar = false
  static readonly behaelterRahmen = false
  static readonly editorPlatz = 'muster'
  static readonly vorgaben = {}
  static override styles = [Grundbaustein.styles, css`
    :host { display: none; }
    :host([data-ff-editor]) { display: block; max-width: 420px; }
    .titel { margin: 0 0 6px; color: var(--se-muted); font-size: var(--se-fs-sm); }
  `]
  override render(): TemplateResult {
    return html`<p class="titel">Kartenmuster · gilt für alle Spalten und Zimmer</p><slot></slot>`
  }
}
Grundbaustein.defineAndRegister(KanbanMusterBlock)
