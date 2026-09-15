// Die Bediener-Spaltenwahl: das Fenster am Spaltenkopf und was weggenommen ist.
import { html, nothing, type TemplateResult } from 'lit'
import { macheBedienerStand } from './bedienerStand'
import type { Spalte } from './spalten'

// Gemerkt werden die weggenommenen Spalten an ihrer Kennung.
function deuteWeggenommene(roh: unknown): string[] | null {
  if (!Array.isArray(roh)) return null
  const liste = roh.filter((k): k is string => typeof k === 'string')
  return liste.length === 0 ? null : liste
}

const gemerkteSpaltenWahl = macheBedienerStand('ff_spaltenwahl_', deuteWeggenommene)

export interface SpaltenWahlLage {
  waehlbar: readonly Spalte[]

  weg: ReadonlySet<string>

  links: number
  oben: number
}

export interface SpaltenWahlHandeln {
  schalte: (kennung: string) => void
  alleZeigen: () => void
  schliesse: () => void
}

export function spaltenWahlTpl(
  lage: SpaltenWahlLage | null,
  tun: SpaltenWahlHandeln,
): TemplateResult | typeof nothing {
  if (lage === null) return nothing
  const sichtbare = lage.waehlbar.filter((s) => !lage.weg.has(s.kennung)).length
  return html`<div class="sw-schirm" @pointerdown=${tun.schliesse}></div>
    <div
      class="spaltenwahl"
      role="dialog"
      aria-label="Spalten zeigen oder verbergen"
      style="left: ${lage.links}px; top: ${lage.oben}px"
      @pointerdown=${(e: Event) => e.stopPropagation()}
      @contextmenu=${(e: Event) => e.preventDefault()}
    >
      <p class="sw-titel">Spalten</p>
      ${lage.waehlbar.map((s) => {
        const an = !lage.weg.has(s.kennung)
        const letzte = an && sichtbare <= 1
        return html`<button
          class=${an ? 'sw-zeile an' : 'sw-zeile'}
          type="button"
          role="menuitemcheckbox"
          aria-checked=${an ? 'true' : 'false'}
          ?disabled=${letzte}
          title=${letzte ? 'Die letzte Spalte bleibt stehen.' : ''}
          @click=${() => tun.schalte(s.kennung)}
        ><span class="sw-haken">${an ? '✓' : ''}</span>${s.titel}</button>`
      })}
      ${lage.weg.size === 0 ? nothing : html`<button
        class="sw-alle"
        type="button"
        @click=${tun.alleZeigen}
      >Alle zeigen</button>`}
    </div>`
}

// Nichts davon ist eine Einstellung des Bausteins: es entsteht beim Bedienen
// der fertigen Maske.

const LEERE_WAHL: ReadonlySet<string> = new Set()

export interface SpaltenWahlWirt {
  baustein: HTMLElement

  an: () => boolean

  // Neu zeichnen und die fluechtigen Breiten vergessen: die haengen am Platz
  // der gezeichneten Spalten.
  melde: () => void
  breitenVergessen: () => void
}

export class SpaltenWahlStand {
  private readonly wirt: SpaltenWahlWirt

  // Erst beim ersten Lesen aus dem Speicher: der Schluessel braucht Maskenname
  // und fertiges Dokument.
  private _weg: Set<string> | null = null

  private _offen: { links: number; oben: number } | null = null

  constructor(wirt: SpaltenWahlWirt) {
    this.wirt = wirt
  }

  get offen(): { links: number; oben: number } | null {
    return this._offen
  }

  weg(): ReadonlySet<string> {
    if (!this.wirt.an()) return LEERE_WAHL
    if (this._weg === null) {
      this._weg = new Set(gemerkteSpaltenWahl.lies(this.wirt.baustein) ?? [])
    }
    return this._weg
  }

  private readonly nimmTaste = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    this.schliesse()
  }

  oeffne(e: MouseEvent, rahmen: DOMRect): void {
    e.preventDefault()
    e.stopPropagation()
    this._offen = {
      links: Math.max(4, Math.min(e.clientX - rahmen.left, Math.max(4, rahmen.width - 170))),
      oben: Math.max(4, Math.min(e.clientY - rahmen.top, Math.max(4, rahmen.height - 60))),
    }
    window.addEventListener('keydown', this.nimmTaste)
    this.wirt.melde()
  }

  schliesse(): void {
    if (this._offen === null) return
    this._offen = null
    window.removeEventListener('keydown', this.nimmTaste)
    this.wirt.melde()
  }

  schalte(kennung: string): void {
    const weg = new Set(this.weg())
    if (weg.has(kennung)) weg.delete(kennung)
    else weg.add(kennung)
    this.merke(weg)
  }

  alleZeigen(): void {
    this.merke(new Set())
  }

  private merke(weg: Set<string>): void {
    this._weg = weg
    gemerkteSpaltenWahl.merke(this.wirt.baustein, weg.size === 0 ? null : [...weg])
    this.wirt.breitenVergessen()
    this.wirt.melde()
  }

  // Beim Abhaengen: die Taste darf nicht am Fenster haengenbleiben.
  loese(): void {
    window.removeEventListener('keydown', this.nimmTaste)
    this._offen = null
  }
}
