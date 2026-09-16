// Baustein Schaltflaeche: startet die eigene Aktionskette und zeigt mit, wie
// viele Zeilen sie vor sich hat.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { abschnitteVon, kettenLesen } from '../../kern/daten/aktionen'
import { meldeKettenFehler, runEvent, sucheTraeger } from '../faehigkeiten/ereignisse'
import { VORMERK_EVENT, vorgemerkteZeilen } from '../faehigkeiten/vormerkStand'
import { starteSe } from '../../softengine/bridge'
import { buttonStil } from './buttonStil'

const KLICK = 'onClick'
const KETTEN_ATTR = 'data-ff-aktionen'

// Was die Kette dieses Knopfs an Zeilen vor sich hat. undefined heisst: sie
// liest keine Vormerkungen, der Knopf bleibt ohne Zaehler.
function offeneZeilen(el: HTMLElement): number | undefined {
  const schritte = kettenLesen(el.getAttribute(KETTEN_ATTR))[KLICK]
  if (!schritte || schritte.length === 0) return undefined
  const gezaehlt = new Set<string>()
  let offen = 0
  for (const abschnitt of abschnitteVon(schritte)) {
    if (abschnitt.art === 'einmal' || abschnitt.blockId === '') continue
    // Dieselbe Liste kann in mehreren Abschnitten stehen; gezaehlt wird sie einmal.
    const kennung = abschnitt.art + ' ' + abschnitt.blockId
    if (gezaehlt.has(kennung)) continue
    const traeger = sucheTraeger(el.ownerDocument ?? document, abschnitt.blockId)
    if (!traeger) continue
    gezaehlt.add(kennung)
    offen += vorgemerkteZeilen(traeger, abschnitt.art)
  }
  return gezaehlt.size === 0 ? undefined : offen
}

export class Button extends Grundbaustein {
  static readonly typ = 'button'
  static readonly tag = 'ff-button'
  static readonly anzeigeName = 'Schaltfläche'
  static readonly kategorie: Kategorie = 'eingabe'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'ereignisse', liste: [{ schluessel: KLICK, name: 'Klick' }] },
  ]

  static readonly vorgaben = { beschriftung: 'Schaltfläche' }

  static readonly breiteAenderbar = false

  static readonly raster = { startBreite: 8, startHoehe: 2, minBreite: 4, minHoehe: 2 }

  static override readonly eigenschaften: Eigenschaft[] = []

  static override styles: CSSResultGroup = [Grundbaustein.styles, buttonStil]

  @property() beschriftung = 'Schaltfläche'

  // Abgeschaltet wird der Knopf NIE: ohne Vormerkung sagt die Kette im Balken,
  // warum nichts hinausging.
  @state() private offen: number | undefined = undefined

  private verdrahtet = false

  private readonly zaehle = (): void => { this.offen = offeneZeilen(this) }

  override render(): TemplateResult {
    const offen = this.offen
    return html`<button
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'beschriftung')}
    >${offen ? `${this.beschriftung} (${offen})` : this.beschriftung}</button>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.imEditor) return
    this.verdrahteKlick()
    document.addEventListener(VORMERK_EVENT, this.zaehle)
    this.zaehle()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener(VORMERK_EVENT, this.zaehle)
  }

  // Einmal je Knopf: connectedCallback laeuft erneut, sobald er im Baum umzieht.
  private verdrahteKlick(): void {
    if (this.verdrahtet || !this.hasAttribute(KETTEN_ATTR)) return
    this.verdrahtet = true
    const ketten = kettenLesen(this.getAttribute(KETTEN_ATTR))
    // Geweckt wird SoftEngine nur, wenn ein Schritt wirklich eine Relation faehrt.
    if (Object.values(ketten).some((kette) => kette.some((s) => s.art === 'RELATION'))) starteSe()
    this.addEventListener('click', () => {
      runEvent(this, KLICK, {}).catch(meldeKettenFehler)
    })
  }
}

Grundbaustein.defineAndRegister(Button)
