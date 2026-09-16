// Die gemeinsame Grundlage jedes Bausteins: Anmeldung, Editor-Frage, Eigenschaften melden.
import { css, LitElement, type CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import type { BausteinElement, BausteinKlasse } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { meldeBausteinArt } from '../../kern/maske/registry'
import { hatFaehigkeit } from '../../kern/maske/faehigkeiten'
import { FLUSS_VORGABEN } from '../../kern/maske/fluss'
import { RASTER_VORGABEN } from '../../kern/maske/raster'
import { AUSWAHL_FOLGE_DEFAULTS } from '../../kern/daten/auswahlFolge'
import { QUELLEN_DEFAULTS } from '../../kern/daten/weitereQuellen'
import { starteUmbenennen } from '../shared/umbenennen'

// Maskenhaelfte der Anmeldung: aus der Klasse wird ein Element.
function definiere(BlockClass: BausteinKlasse): void {
  if (!customElements.get(BlockClass.tag)) {
    customElements.define(
      BlockClass.tag,
      BlockClass as unknown as CustomElementConstructor,
    )
  }
}

// Editorhaelfte der Anmeldung: der Bausteintyp steht in der Registry.
function beschreibe(BlockClass: BausteinKlasse): void {
  const faehig = { faehigkeiten: BlockClass.faehigkeiten ?? [] }
  meldeBausteinArt({
    typ: BlockClass.typ,
    tag: BlockClass.tag,
    name: BlockClass.anzeigeName,
    kategorie: BlockClass.kategorie,

    vorgaben: {
      ...FLUSS_VORGABEN,
      ...RASTER_VORGABEN,
      ...(hatFaehigkeit(faehig, 'quelle') ? QUELLEN_DEFAULTS : null),

      ...(hatFaehigkeit(faehig, 'auswahlFolgen') ? AUSWAHL_FOLGE_DEFAULTS : null),
      ...BlockClass.vorgaben,
    },
    eigenschaften: BlockClass.eigenschaften,
    nimmtKinder: BlockClass.nimmtKinder ?? false,
    breiteAenderbar: BlockClass.breiteAenderbar ?? true,
    hoeheAenderbar: BlockClass.hoeheAenderbar ?? false,
    erlaubteKinder: BlockClass.erlaubteKinder,
    erlaubteEltern: BlockClass.erlaubteEltern,
    festeBreite: BlockClass.festeBreite,
    kinderVorgabe: BlockClass.kinderVorgabe,
    kinderRichtung: BlockClass.kinderRichtung,
    inPalette: BlockClass.inPalette,
    musterKind: BlockClass.musterKind,
    editorPlatz: BlockClass.editorPlatz,
    behaelterRahmen: BlockClass.behaelterRahmen,
    kindKnopf: BlockClass.kindKnopf,
    faehigkeiten: faehig.faehigkeiten,
    seite: BlockClass.seite,
    raster: BlockClass.raster,
  })
}

export abstract class Grundbaustein extends LitElement implements BausteinElement {
  static override styles: CSSResultGroup = css`
    :host { display: block; }
    :host([hidden]) { display: none; }

    :host([fuellt]) { height: 100%; box-sizing: border-box; }
    [data-ff-editable] { cursor: text; }
    :host(:not([data-editable])) [data-ff-editable] { cursor: inherit; }
    :host([data-ff-editor]) [data-ff-bound] {
      text-decoration: underline dotted var(--se-accent);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
    :host([data-ff-editor][data-editable]) [data-ff-bound] { cursor: pointer; }
  `

  static readonly eigenschaften: Eigenschaft[] = []

  @property({ type: Boolean, reflect: true, attribute: 'data-editable' })
  editable = false

  get eigenschaften(): Eigenschaft[] {
    return (this.constructor as typeof Grundbaustein).eigenschaften
  }

  // Steht der Baustein auf der Leinwand des Editors oder in der fertigen Maske?
  // Ein Name dafuer, geerbt von jedem Baustein.
  get imEditor(): boolean {
    return this.hasAttribute('data-ff-editor')
  }

  protected inlineEdit(event: MouseEvent, attr: string): void {
    if (!this.editable) return
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    if (target.hasAttribute('data-ff-bound')) return
    event.stopPropagation()
    event.preventDefault()
    starteUmbenennen(target, (neu, original) => {
      if (neu === original) return true
      const detail: { attr: string; value: string; abgelehnt?: boolean } = { attr, value: neu }
      this.dispatchEvent(new CustomEvent('ff-prop-change', {
        detail,
        bubbles: true,
        composed: true,
      }))
    // Der getippte Stand bleibt stehen, bis der Editor die Eigenschaft
    // zurueckgibt; hat er sie verworfen, muss der alte Text selbst wieder hin.
      return detail.abgelehnt !== true
    })
  }

  static defineAndRegister(BlockClass: BausteinKlasse): void {
    definiere(BlockClass)
    beschreibe(BlockClass)
  }
}
