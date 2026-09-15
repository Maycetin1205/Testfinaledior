// Baustein Datum: waehlt den Tag, den die Maske zeigt.
import { css, html, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import type { Kategorie } from '../../core/blocks/BlockComponent'
import type { Eigenschaft } from '../../core/blocks/PropertyDescription'
import { BasicBlock } from '../base/BasicBlock'
import { heuteSchluessel, tagPlus } from '../shared/datumSchluessel'
import { aufTagHoeren, gewaehlterTag, setzeGewaehltenTag } from '../shared/gewaehlterTag'

export class DatumBlock extends BasicBlock {
  static readonly blockType = 'datum'
  static readonly tagName = 'ff-datum'
  static readonly displayName = 'Datum'
  static readonly category: Kategorie = 'anzeige'
  static readonly defaultProps = {}
  static override readonly customProperties: Eigenschaft[] = []

  static readonly raster = { startW: 18, startH: 2, minW: 10, minH: 2 }

  static override styles = [
    BasicBlock.styles,
    css`

      .waehler {
        --tag-h: 34px;

        --tag-feld-min: 112px;
        display: flex;
        align-items: stretch;
        gap: var(--se-gap-sm);
        height: var(--tag-h);
        font-family: var(--se-font);
      }

      .riegel {
        box-sizing: border-box;
        display: flex;
        align-items: stretch;
        flex: 1;
        min-width: 0;
        height: 100%;
        padding: 2px;
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-r-sm);
        background: var(--se-panel);
      }

      .pfeil {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        padding: 0;
        border: none;
        border-radius: var(--se-r-sm);
        background: transparent;
        color: var(--se-muted);
        font-family: var(--se-font);
        font-size: var(--se-fs-lg);
        line-height: 1;
        cursor: pointer;
      }
      .pfeil:hover { background: var(--se-panel-2); color: var(--se-ink); }

      .feld {
        box-sizing: border-box;

        flex: 1;
        min-width: var(--tag-feld-min);
        border: none;
        background: transparent;
        padding: 0 2px;
        font-family: var(--se-font);
        font-size: var(--se-fs);
        font-weight: 600;
        color: var(--se-ink);
        text-align: center;
      }
      .feld:focus { outline: none; }

      .heute {
        box-sizing: border-box;
        flex: none;
        height: 100%;
        padding: 0 9px;
        border: var(--se-border) solid var(--se-line);
        border-radius: var(--se-r-sm);
        background: var(--se-panel);
        color: var(--se-ink);
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        font-weight: 550;
        white-space: nowrap;
        cursor: pointer;
      }
      .heute:hover { border-color: var(--se-accent); color: var(--se-accent); }

      :host { container-type: inline-size; }
      @container (max-width: 210px) {
        .heute { display: none; }
      }
      @container (max-width: 160px) {
        .waehler { --tag-feld-min: 80px; }
      }

      :host([data-ff-editor]) .feld,
      :host([data-ff-editor]) .pfeil,
      :host([data-ff-editor]) .heute { pointer-events: none; }

      :host([fuellt]) .waehler { height: 100%; }
    `,
  ]

  @state() private tag = ''

  private tagAbmelden: (() => void) | null = null

  private setzeTag(neu: string): void {
    setzeGewaehltenTag(neu)
    this.tag = gewaehlterTag()
  }

  override render(): TemplateResult {
    return html`<div class="waehler">
      <div class="riegel">
        <button class="pfeil" title="Vortag" @click=${() => this.setzeTag(tagPlus(this.tag, -1))}>‹</button>
        <input
          class="feld"
          type="date"
          .value=${this.tag}
          @change=${(e: Event) => this.setzeTag((e.target as HTMLInputElement).value)}
        />
        <button class="pfeil" title="Folgetag" @click=${() => this.setzeTag(tagPlus(this.tag, 1))}>›</button>
      </div>
      <button class="heute" @click=${() => this.setzeTag(heuteSchluessel(new Date()))}>Heute</button>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()

    this.tag = gewaehlterTag() || heuteSchluessel(new Date())
    if (this.imEditor) return
    this.setzeTag(this.tag)

    this.tagAbmelden?.()
    this.tagAbmelden = aufTagHoeren(() => { this.tag = gewaehlterTag() })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.tagAbmelden?.()
    this.tagAbmelden = null
  }
}

BasicBlock.defineAndRegister(DatumBlock)
