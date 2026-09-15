// Der Rahmen jedes Fensters: Titel, Schliessen, Tasten und die zwei Zieh-Anfasser.
import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

export const DIALOG_RAHMEN_TAG = 'ff-dialog-rahmen'
export const DIALOG_SCHLIESSEN_EVENT = 'ff-dialog-schliessen'

// Der Rahmen aendert sich NICHT selbst: er meldet nur, und wer ihn benutzt,
// speichert und gibt die neue Groesse zurueck. So landet das Mass als
// Eigenschaft im Baum und Strg+Z greift.
export const DIALOG_GROESSE_EVENT = 'ff-dialog-groesse'

export interface DialogGroesseDetail {
  achse: 'breite' | 'hoehe'

  wert: number

  // 'standard' ist der Doppelklick auf den Anfasser; `wert` gilt dann nicht,
  // der Empfaenger nimmt seinen eigenen Startwert.
  geste: 'beginn' | 'laeuft' | 'ende' | 'standard'
}

export const DIALOG_RAND = 24

const DIALOG_MIN_BREITE = 240
const DIALOG_MIN_HOEHE = 160

function pixel(wert: unknown, ersatz: number): number {
  const zahl = Number(wert)
  return Number.isFinite(zahl) && zahl > 0 ? zahl : ersatz
}

// Escape gehoert dem obersten offenen Fenster: SoftEngines SEEvent.js hoert am
// document mit und schliesst damit sonst die ganze Maske.
const fangendeFenster: DialogRahmen[] = []

function aufEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  const oberstes = fangendeFenster.filter((f) => f.isConnected).pop()
  if (!oberstes) return
  event.stopPropagation()
  oberstes.schliesse()
}

function faengtEscape(fenster: DialogRahmen, faengt: boolean): void {
  const platz = fangendeFenster.indexOf(fenster)
  if (faengt && platz < 0) fangendeFenster.push(fenster)
  if (!faengt && platz >= 0) fangendeFenster.splice(platz, 1)

  // Am window in der Abfang-Phase, damit die Taste SoftEngine nie erreicht.
  if (fangendeFenster.length === 1) window.addEventListener('keydown', aufEscape, true)
  if (fangendeFenster.length === 0) window.removeEventListener('keydown', aufEscape, true)
}

export class DialogRahmen extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      display: block;
      font-family: var(--se-font);
      font-size: var(--se-fs);
      line-height: var(--se-lh);
      color: var(--se-ink);
    }

    :host([viewport]) {
      position: fixed;
      z-index: 2147483646;
    }
    .abdunklung,
    .buehne {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
    }
    .abdunklung { background: var(--se-scrim); }
    .buehne {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fenster {
      position: relative;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      max-width: calc(100% - ${DIALOG_RAND}px);
      max-height: calc(100% - ${DIALOG_RAND}px);
      overflow: hidden;
      background: var(--se-panel);
      border: var(--se-border) solid var(--se-line);
      border-radius: var(--se-r-lg);
    }
    .kopf {
      flex: none;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 6px 6px 12px;
      background: var(--se-panel-2);
      border-bottom: var(--se-border) solid var(--se-line-soft);
    }
    .titel {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      color: var(--se-ink);

      font-size: var(--se-fs-lg);
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .schliessen {
      flex: none;
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      border-radius: var(--se-r-sm);
      background: none;
      color: var(--se-muted);
      font: inherit;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
    }
    .schliessen:hover {
      background: var(--se-line-soft);
      color: var(--se-ink);
    }
    .inhalt {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    .anfasser {
      position: absolute;
      border-radius: 4px;
      background: var(--se-accent);
      touch-action: none;
      z-index: 2;
    }
    .anfasser.breit {
      top: 50%;
      right: -3px;
      width: 7px;
      height: 26px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }
    .anfasser.hoch {
      left: 50%;
      bottom: -3px;
      width: 26px;
      height: 7px;
      transform: translateX(-50%);
      cursor: ns-resize;
    }
  `

  @property() titel = 'Dialog'
  @property({ type: Number }) breite = 520
  @property({ type: Number }) hoehe = 380
  @property({ type: Boolean, reflect: true }) viewport = false
  @property({ type: Boolean, attribute: 'escape-schliesst' }) escapeSchliesst = false

  // Nur der Editor setzt das: zur Laufzeit hat der Bediener an der Groesse
  // nichts zu stellen.
  @property({ type: Boolean, reflect: true }) ziehbar = false

  private escapeRegistriert = false

  private aktualisiereEscape(): void {
    const sollRegistriert = this.isConnected && this.escapeSchliesst
    if (sollRegistriert === this.escapeRegistriert) return
    this.escapeRegistriert = sollRegistriert
    faengtEscape(this, sollRegistriert)
  }

  private ziehe(event: PointerEvent, achse: 'breite' | 'hoehe'): void {
    if (!this.ziehbar) return
    event.preventDefault()
    event.stopPropagation()

    const start = achse === 'breite'
      ? pixel(this.breite, 520)
      : pixel(this.hoehe, 380)
    const min = achse === 'breite' ? DIALOG_MIN_BREITE : DIALOG_MIN_HOEHE
    const startPos = achse === 'breite' ? event.clientX : event.clientY

    // Die Kante wandert nur halb so weit wie der Zeiger: das Fenster steht
    // mittig und waechst nach beiden Seiten.
    let letzter = Math.max(min, Math.round(start))
    let gemeldet = false

    const melde = (wert: number, geste: DialogGroesseDetail['geste']): void => {
      this.dispatchEvent(new CustomEvent<DialogGroesseDetail>(DIALOG_GROESSE_EVENT, {
        detail: { achse, wert, geste },
        bubbles: true,
        composed: true,
      }))
    }

    const beiBewegung = (ev: PointerEvent): void => {
      const pos = achse === 'breite' ? ev.clientX : ev.clientY
      const naechster = Math.max(min, Math.round(start + (pos - startPos) * 2))
      if (naechster === letzter) return
      letzter = naechster
      melde(naechster, gemeldet ? 'laeuft' : 'beginn')
      gemeldet = true
    }

    const beende = (): void => {
      window.removeEventListener('pointermove', beiBewegung)
      window.removeEventListener('pointerup', beende)
      window.removeEventListener('pointercancel', beende)
      window.removeEventListener('blur', beende)
      if (gemeldet) melde(letzter, 'ende')
    }

    window.addEventListener('pointermove', beiBewegung)
    window.addEventListener('pointerup', beende)
    window.addEventListener('pointercancel', beende)
    window.addEventListener('blur', beende)
  }

  private aufStandard(event: Event, achse: 'breite' | 'hoehe'): void {
    if (!this.ziehbar) return
    event.stopPropagation()
    this.dispatchEvent(new CustomEvent<DialogGroesseDetail>(DIALOG_GROESSE_EVENT, {
      detail: { achse, wert: 0, geste: 'standard' },
      bubbles: true,
      composed: true,
    }))
  }

  schliesse(): void {
    this.dispatchEvent(new CustomEvent(DIALOG_SCHLIESSEN_EVENT, {
      bubbles: true,
      composed: true,
    }))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.aktualisiereEscape()
  }

  protected override updated(geaendert: PropertyValues<this>): void {
    if (geaendert.has('escapeSchliesst')) this.aktualisiereEscape()
  }

  override disconnectedCallback(): void {
    if (this.escapeRegistriert) {
      this.escapeRegistriert = false
      faengtEscape(this, false)
    }
    super.disconnectedCallback()
  }

  override render(): TemplateResult {
    const breite = pixel(this.breite, 520)
    const hoehe = pixel(this.hoehe, 380)
    return html`
      <div class="abdunklung"></div>
      <div class="buehne">
        <section
          class="fenster"
          role="dialog"
          aria-labelledby="dialog-titel"
          style="width:${breite}px;height:${hoehe}px"
        >
          <header class="kopf">
            <div class="titel" id="dialog-titel"><slot name="titel">${this.titel}</slot></div>
            <button
              class="schliessen"
              type="button"
              aria-label="Schließen"
              title="Schließen"
              @click=${this.schliesse}
            >✕</button>
          </header>
          <div class="inhalt"><slot></slot></div>
          ${this.ziehbar ? html`
            <div
              class="anfasser breit"
              title="Breite ziehen · Doppelklick: Standard"
              @pointerdown=${(e: PointerEvent) => this.ziehe(e, 'breite')}
              @dblclick=${(e: Event) => this.aufStandard(e, 'breite')}
            ></div>
            <div
              class="anfasser hoch"
              title="Höhe ziehen · Doppelklick: Standard"
              @pointerdown=${(e: PointerEvent) => this.ziehe(e, 'hoehe')}
              @dblclick=${(e: Event) => this.aufStandard(e, 'hoehe')}
            ></div>
          ` : nothing}
        </section>
      </div>
    `
  }
}

if (!customElements.get(DIALOG_RAHMEN_TAG)) {
  customElements.define(DIALOG_RAHMEN_TAG, DialogRahmen)
}
