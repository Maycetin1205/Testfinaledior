import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

export const DIALOG_FRAME_TAG = 'ff-dialog'
export const DIALOG_CLOSE_EVENT = 'ff-dialog-close'

export const DIALOG_SIZE_EVENT = 'ff-dialog-groesse'

export interface DialogSizeDetail {
  axis: 'width' | 'height'

  value: number

  gesture: 'beginn' | 'runs' | 'end' | 'standard'
}

export const DIALOG_EDGE = 24

const DIALOG_MIN_WIDTH = 240
const DIALOG_MIN_HEIGHT = 160

function pixel(value: unknown, replacement: number): number {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : replacement
}

const catchingWindow: DialogFrame[] = []

function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  const topmost = catchingWindow.filter((f) => f.isConnected).pop()
  if (!topmost) return
  event.stopPropagation()
  topmost.close()
}

function catchesEscape(window: DialogFrame, catches: boolean): void {
  const slot = catchingWindow.indexOf(window)
  if (catches && slot < 0) catchingWindow.push(window)
  if (!catches && slot >= 0) catchingWindow.splice(slot, 1)

  if (catchingWindow.length === 1) window.addEventListener('keydown', onEscape, true)
  if (catchingWindow.length === 0) window.removeEventListener('keydown', onEscape, true)
}

export class DialogFrame extends LitElement {
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
      max-width: calc(100% - ${DIALOG_EDGE}px);
      max-height: calc(100% - ${DIALOG_EDGE}px);
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

  @property() heading = 'Dialog'
  @property({ type: Number }) width = 520
  @property({ type: Number }) height = 380
  @property({ type: Boolean, reflect: true }) viewport = false
  @property({ type: Boolean, attribute: 'escape-closes' }) escapeCloses = false

  @property({ type: Boolean, reflect: true }) movable = false

  private escapeRegistered = false

  private refreshEscape(): void {
    const shouldRegistered = this.isConnected && this.escapeCloses
    if (shouldRegistered === this.escapeRegistered) return
    this.escapeRegistered = shouldRegistered
    catchesEscape(this, shouldRegistered)
  }

  private drag(event: PointerEvent, axis: 'width' | 'height'): void {
    if (!this.movable) return
    event.preventDefault()
    event.stopPropagation()

    const start = axis === 'width'
      ? pixel(this.width, 520)
      : pixel(this.height, 380)
    const min = axis === 'width' ? DIALOG_MIN_WIDTH : DIALOG_MIN_HEIGHT
    const startPos = axis === 'width' ? event.clientX : event.clientY

    let last = Math.max(min, Math.round(start))
    let reported = false

    const report = (value: number, gesture: DialogSizeDetail['gesture']): void => {
      this.dispatchEvent(new CustomEvent<DialogSizeDetail>(DIALOG_SIZE_EVENT, {
        detail: { axis, value, gesture },
        bubbles: true,
        composed: true,
      }))
    }

    const onMove = (ev: PointerEvent): void => {
      const pos = axis === 'width' ? ev.clientX : ev.clientY
      const next = Math.max(min, Math.round(start + (pos - startPos) * 2))
      if (next === last) return
      last = next
      report(next, reported ? 'runs' : 'beginn')
      reported = true
    }

    const finish = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('blur', finish)
      if (reported) report(last, 'end')
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', finish)
  }

  private onStandard(event: Event, axis: 'width' | 'height'): void {
    if (!this.movable) return
    event.stopPropagation()
    this.dispatchEvent(new CustomEvent<DialogSizeDetail>(DIALOG_SIZE_EVENT, {
      detail: { axis, value: 0, gesture: 'standard' },
      bubbles: true,
      composed: true,
    }))
  }

  close(): void {
    this.dispatchEvent(new CustomEvent(DIALOG_CLOSE_EVENT, {
      bubbles: true,
      composed: true,
    }))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.refreshEscape()
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('escapeCloses')) this.refreshEscape()
  }

  override disconnectedCallback(): void {
    if (this.escapeRegistered) {
      this.escapeRegistered = false
      catchesEscape(this, false)
    }
    super.disconnectedCallback()
  }

  override render(): TemplateResult {
    const width = pixel(this.width, 520)
    const height = pixel(this.height, 380)
    return html`
      <div class="abdunklung"></div>
      <div class="buehne">
        <section
          class="fenster"
          role="dialog"
          aria-labelledby="dialog-titel"
          style="width:${width}px;height:${height}px"
        >
          <header class="kopf">
            <div class="titel" id="dialog-titel"><slot name="title">${this.heading}</slot></div>
            <button
              class="schliessen"
              type="button"
              aria-label="Schließen"
              title="Schließen"
              @click=${this.close}
            >✕</button>
          </header>
          <div class="inhalt"><slot></slot></div>
          ${this.movable ? html`
            <div
              class="anfasser breit"
              title="Breite ziehen · Doppelklick: Standard"
              @pointerdown=${(e: PointerEvent) => this.drag(e, 'width')}
              @dblclick=${(e: Event) => this.onStandard(e, 'width')}
            ></div>
            <div
              class="anfasser hoch"
              title="Höhe ziehen · Doppelklick: Standard"
              @pointerdown=${(e: PointerEvent) => this.drag(e, 'height')}
              @dblclick=${(e: Event) => this.onStandard(e, 'height')}
            ></div>
          ` : nothing}
        </section>
      </div>
    `
  }
}

if (!customElements.get(DIALOG_FRAME_TAG)) {
  customElements.define(DIALOG_FRAME_TAG, DialogFrame)
}
