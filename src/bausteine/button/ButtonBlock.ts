// Baustein Knopf: startet seine Aktionskette, zeigt offene Vormerkungen mit.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { connectClickAktionen } from '../faehigkeiten/ereignisse'
import {
  VORMERK_EVENT,
  vormerkStandVon,
  vormerkSumme,
  type VormerkZahlen,
} from '../shared/vormerkStand'

export class ButtonBlock extends Grundbaustein {
  static readonly typ = 'button'
  static readonly tag = 'ff-button'
  static readonly anzeigeName = 'Schaltfläche'
  static readonly kategorie: Kategorie = 'eingabe'
  static readonly vorgaben = { label: 'Schaltfläche' }

  static readonly breiteAenderbar = false

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'ereignisse', liste: [{ schluessel: 'onClick', name: 'Klick' }] },
  ]

  static readonly raster = { startBreite: 8, startHoehe: 2, minBreite: 4, minHoehe: 2 }

  static override readonly eigenschaften: Eigenschaft[] = []

  static override styles = [
    Grundbaustein.styles,
    css`
      button {
        box-sizing: border-box;
        padding: 7px 16px;
        cursor: pointer;
        border-radius: var(--se-r-md);
        border: var(--se-border) solid var(--se-accent);
        background: var(--se-accent);
        color: var(--se-panel);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 600;

        line-height: 1.2;

        transition: background-color var(--se-move), border-color var(--se-move);
      }
      button:hover { background: var(--se-accent-dark); border-color: var(--se-accent-dark); }

      button:active { background: var(--se-accent-dark); border-color: var(--se-ink); }
      button:focus-visible { outline: 2px solid var(--se-accent); outline-offset: 2px; }

      :host([fuellt]) button { width: 100%; height: 100%; }
    `,
  ]

  @property() label = 'Schaltfläche'

  // Liest die Kette dieses Knopfs Vormerkungen, steht ihre Zahl im Label.
  // undefined heisst: gewoehnlicher Knopf. Abgeschaltet wird er NIE:
  // ohne Vormerkung sagt die Kette im Balken, warum nichts hinausging.
  @property({ attribute: false }) vormerkungen: VormerkZahlen | undefined = undefined

  private readonly zaehleVormerkungen = (): void => {
    this.vormerkungen = vormerkStandVon(this, 'onClick')
  }

  override render(): TemplateResult {
    const zahlen = this.vormerkungen
    const offen = zahlen === undefined ? 0 : vormerkSumme(zahlen)
    return html`<button
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${offen === 0 ? this.label : `${this.label} (${offen})`}</button>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    connectClickAktionen(this, 'onClick')
    if (this.imEditor) return
    document.addEventListener(VORMERK_EVENT, this.zaehleVormerkungen)
    this.zaehleVormerkungen()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener(VORMERK_EVENT, this.zaehleVormerkungen)
  }
}

Grundbaustein.defineAndRegister(ButtonBlock)
