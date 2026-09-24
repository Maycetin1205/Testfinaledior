import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { maskState } from '../../runtime/maskState'

export const DIALOG_FRAME_TAG = 'ff-dialog'
export const DIALOG_CLOSE_EVENT = 'ff-dialog-close'

export const DIALOG_SIZE_EVENT = 'ff-dialog-resize'

export interface DialogSizeDetail {
  axis: 'width' | 'height'

  value: number

  gesture: 'start' | 'move' | 'end' | 'reset'
}

export const DIALOG_EDGE = 24

export const WINDOW_WIDTH = 520
export const WINDOW_HEIGHT = 380

const DIALOG_MIN_WIDTH = 240
const DIALOG_MIN_HEIGHT = 160

function pixel(value: unknown, replacement: number): number {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : replacement
}

function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  const topmost = maskState.catchingFrames.filter((f) => f.isConnected).pop()
  if (!topmost) return
  event.stopPropagation()
  topmost.close()
}

function catchesEscape(frame: DialogFrame, catches: boolean): void {
  const catchingFrames = maskState.catchingFrames
  const slot = catchingFrames.indexOf(frame)
  if (catches && slot < 0) {
    catchingFrames.push(frame)
    if (catchingFrames.length === 1) window.addEventListener('keydown', onEscape, true)
  }
  if (!catches && slot >= 0) {
    catchingFrames.splice(slot, 1)
    if (catchingFrames.length === 0) window.removeEventListener('keydown', onEscape, true)
  }
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
    .scrim,
    .stage {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
    }
    .scrim { background: var(--se-scrim); }
    .stage {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .window {
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
    .head {
      flex: none;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 6px 6px 12px;
      background: var(--se-panel-2);
      border-bottom: var(--se-border) solid var(--se-line-soft);
    }
    .title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      color: var(--se-ink);

      font-size: var(--se-fs-lg);
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .close {
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
    .close:hover {
      background: var(--se-line-soft);
      color: var(--se-ink);
    }
    .content {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    .handle {
      position: absolute;
      border-radius: 4px;
      background: var(--se-accent);
      touch-action: none;
      z-index: 2;
    }
    .handle.width {
      top: 50%;
      right: -3px;
      width: 7px;
      height: 26px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }
    .handle.height {
      left: 50%;
      bottom: -3px;
      width: 26px;
      height: 7px;
      transform: translateX(-50%);
      cursor: ns-resize;
    }
  `

  @property() heading = 'Dialog'
  @property({ type: Number }) width = WINDOW_WIDTH
  @property({ type: Number }) height = WINDOW_HEIGHT
  @property({ type: Boolean, reflect: true }) viewport = false
  @property({ type: Boolean, attribute: 'escape-closes' }) escapeCloses = false

  @property({ type: Boolean, reflect: true }) movable = false

  private escapeRegistered = false

  private refreshEscape(): void {
    const shouldRegister = this.isConnected && this.escapeCloses
    if (shouldRegister === this.escapeRegistered) return
    this.escapeRegistered = shouldRegister
    catchesEscape(this, shouldRegister)
  }

  private drag(event: PointerEvent, axis: 'width' | 'height'): void {
    if (!this.movable) return
    event.preventDefault()
    event.stopPropagation()

    const start = axis === 'width'
      ? pixel(this.width, WINDOW_WIDTH)
      : pixel(this.height, WINDOW_HEIGHT)
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
      report(next, reported ? 'move' : 'start')
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

  private onReset(event: Event, axis: 'width' | 'height'): void {
    if (!this.movable) return
    event.stopPropagation()
    this.dispatchEvent(new CustomEvent<DialogSizeDetail>(DIALOG_SIZE_EVENT, {
      detail: { axis, value: 0, gesture: 'reset' },
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
    const width = pixel(this.width, WINDOW_WIDTH)
    const height = pixel(this.height, WINDOW_HEIGHT)
    return html`
      <div class="scrim"></div>
      <div class="stage">
        <section
          class="window"
          role="dialog"
          aria-labelledby="dialog-title"
          style="width:${width}px;height:${height}px"
        >
          <header class="head">
            <div class="title" id="dialog-title"><slot name="title">${this.heading}</slot></div>
            <button
              class="close"
              type="button"
              aria-label="Schließen"
              title="Schließen"
              @click=${this.close}
            >✕</button>
          </header>
          <div class="content"><slot></slot></div>
          ${this.movable ? html`
            <div
              class="handle width"
              @pointerdown=${(e: PointerEvent) => this.drag(e, 'width')}
              @dblclick=${(e: Event) => this.onReset(e, 'width')}
            ></div>
            <div
              class="handle height"
              @pointerdown=${(e: PointerEvent) => this.drag(e, 'height')}
              @dblclick=${(e: Event) => this.onReset(e, 'height')}
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
