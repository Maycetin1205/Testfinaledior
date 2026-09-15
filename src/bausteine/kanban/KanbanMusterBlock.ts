import { css, html, type TemplateResult } from 'lit'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'

export class KanbanMusterBlock extends Grundbaustein {
  static readonly blockType = 'kanban-muster'
  static readonly tagName = 'ff-kanban-muster'
  static readonly displayName = 'Kartenmuster'
  static readonly category: Kategorie = 'anzeige'
  static readonly acceptsChildren = true
  static readonly allowedChildTypes = ['card']
  static readonly allowedParentTypes = ['kanban']
  static readonly showInPalette = false
  static readonly resizableWidth = false
  static readonly containerHint = false
  static readonly editorSlot = 'muster'
  static readonly defaultProps = {}
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
