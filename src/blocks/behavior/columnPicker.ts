import { html, nothing, type TemplateResult } from 'lit'
import { makeOperatorState } from './operatorState'
import type { Column } from './columns'

function readRemoved(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const list = raw.filter((k): k is string => typeof k === 'string')
  return list.length === 0 ? null : list
}

const rememberedColumnsChoice = makeOperatorState('ff_column_choice_', 'ff_spaltenwahl_', readRemoved)

export interface ColumnsChoicePlacement {
  selectable: readonly Column[]

  away: ReadonlySet<string>

  left: number
  top: number
}

export interface ColumnsChoiceAct {
  toggle: (key: string) => void
  showAll: () => void
  close: () => void
}

export function columnsChoiceTpl(
  placement: ColumnsChoicePlacement | null,
  act: ColumnsChoiceAct,
): TemplateResult | typeof nothing {
  if (placement === null) return nothing
  const visible = placement.selectable.filter((s) => !placement.away.has(s.key)).length
  return html`<div class="picker-backdrop" @pointerdown=${act.close}></div>
    <div
      class="column-picker"
      role="dialog"
      aria-label="Spalten zeigen oder verbergen"
      style="left: ${placement.left}px; top: ${placement.top}px"
      @pointerdown=${(e: Event) => e.stopPropagation()}
      @contextmenu=${(e: Event) => e.preventDefault()}
    >
      <p class="picker-title">Spalten</p>
      ${placement.selectable.map((s) => {
        const on = !placement.away.has(s.key)
        const last = on && visible <= 1
        return html`<button
          class=${on ? 'picker-row checked' : 'picker-row'}
          type="button"
          role="menuitemcheckbox"
          aria-checked=${on ? 'true' : 'false'}
          ?disabled=${last}
          @click=${() => act.toggle(s.key)}
        ><span class="picker-check">${on ? '✓' : ''}</span>${s.title}</button>`
      })}
      ${placement.away.size === 0 ? nothing : html`<button
        class="picker-all"
        type="button"
        @click=${act.showAll}
      >Alle zeigen</button>`}
    </div>`
}

const EMPTY_CHOICE: ReadonlySet<string> = new Set()

export interface ColumnsChoiceHost {
  block: HTMLElement

  on: () => boolean

  report: () => void
  forgetWidths: () => void
}

export class ColumnsChoiceState {
  private readonly host: ColumnsChoiceHost

  private _away: Set<string> | null = null

  private _open: { left: number; top: number } | null = null

  constructor(host: ColumnsChoiceHost) {
    this.host = host
  }

  get open(): { left: number; top: number } | null {
    return this._open
  }

  away(): ReadonlySet<string> {
    if (!this.host.on()) return EMPTY_CHOICE
    if (this._away === null) {
      this._away = new Set(rememberedColumnsChoice.read(this.host.block) ?? [])
    }
    return this._away
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    this.close()
  }

  openAt(e: MouseEvent, frame: DOMRect): void {
    e.preventDefault()
    e.stopPropagation()
    this._open = {
      left: Math.max(4, Math.min(e.clientX - frame.left, Math.max(4, frame.width - 170))),
      top: Math.max(4, Math.min(e.clientY - frame.top, Math.max(4, frame.height - 60))),
    }
    window.addEventListener('keydown', this.onKey)
    this.host.report()
  }

  close(): void {
    if (this._open === null) return
    this._open = null
    window.removeEventListener('keydown', this.onKey)
    this.host.report()
  }

  toggle(key: string): void {
    const away = new Set(this.away())
    if (away.has(key)) away.delete(key)
    else away.add(key)
    this.remember(away)
  }

  showAll(): void {
    this.remember(new Set())
  }

  private remember(away: Set<string>): void {
    this._away = away
    rememberedColumnsChoice.remember(this.host.block, away.size === 0 ? null : [...away])
    this.host.forgetWidths()
    this.host.report()
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKey)
    this._open = null
  }
}
