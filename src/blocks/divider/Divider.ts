import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { dividerStyle } from './dividerStyle'
import {
  THICKNESS_MAX,
  THICKNESS_MIN,
  dividerProperties,
  type DividerValues,
} from './properties'

const LINES: Record<string, string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
}

const COLORS: Record<string, string> = {
  line: '--se-line',
  quiet: '--se-line-soft',
  dark: '--se-muted',
  accent: '--se-accent',
}

function lineOf(value: string): string {
  return LINES[value] ?? LINES.solid
}

function thicknessOf(value: number): number {
  if (!Number.isFinite(value)) return THICKNESS_MIN
  return Math.min(THICKNESS_MAX, Math.max(THICKNESS_MIN, value))
}

function colorOf(value: string): string {
  return `var(${COLORS[value] ?? COLORS.line})`
}

export interface Divider extends DividerValues {}

export class Divider extends BlockElement {
  static readonly type = 'divider'
  static readonly tag = 'ff-divider'

  static override styles: CSSResultGroup = [BlockElement.styles, dividerStyle]

  override render(): TemplateResult {
    const vertical = this.direction === 'vertical'
    return html`<div
      class="flaeche ${vertical ? 'vertical' : ''}"
      role="separator"
      aria-orientation=${vertical ? 'vertical' : 'horizontal'}
      style=${styleMap({
        '--strich-breite': `${thicknessOf(this.thickness)}px`,
        '--strich-stil': lineOf(this.lineStyle),
        '--strich-farbe': colorOf(this.color),
      })}
    ><div class="linie"></div></div>`
  }
}

defineBlock(Divider, {
  name: 'Trennlinie',
  category: 'layout',
  properties: dividerProperties,
  grid: { startWidth: 48, startHeight: 1, minWidth: 1, minHeight: 1 },
})
