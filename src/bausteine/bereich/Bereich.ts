// Baustein Bereich: ein umrandeter Kasten, dessen Inneres eine Rasterflaeche ist.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { bereichStil } from './bereichStil'

export class Bereich extends Grundbaustein {
  static readonly typ = 'bereich'
  static readonly tag = 'ff-bereich'
  static readonly anzeigeName = 'Bereich'
  static readonly kategorie: Kategorie = 'layout'

  // Keine. Der Bereich traegt nur, was in ihm liegt. Vor allem nicht `quelle`:
  // sonst waere er Quellentraeger fuer alles darin, auch ohne gewaehlte Quelle.
  static readonly faehigkeiten: readonly Faehigkeit[] = []

  static readonly nimmtKinder = true
  static readonly rasterFlaeche = true
  // Den Rahmen zeichnet der Baustein selbst; der gestrichelte des Editor-Wirts
  // laege daneben.
  static readonly behaelterRahmen = false

  static readonly breiteAenderbar = true
  static readonly hoeheAenderbar = true

  static readonly raster = { startBreite: 24, startHoehe: 12, minBreite: 4, minHoehe: 3 }

  // Keine: der Kasten hat nichts einzustellen. Was in ihm steht, stellt sich selbst.
  static readonly vorgaben = {}

  static override styles: CSSResultGroup = [Grundbaustein.styles, bereichStil]

  override render(): TemplateResult {
    return html`<div class="rumpf"><slot></slot></div>`
  }
}

Grundbaustein.defineAndRegister(Bereich)
