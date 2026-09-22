import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import { choiceProperty, numberProperty, segmentProperty } from '../../core/block/property'
import type { Capability } from '../../core/block/capability'
import { dividerStyle } from './dividerStyle'

const DIRECTION_STANDARD = 'waagerecht'

const THICKNESS_MIN = 1
const THICKNESS_MAX = 8
const THICKNESS_STANDARD = 1

const LINES: Record<string, string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
}
const LINE_STANDARD = 'solid'
const CSS_LINES = new Set(Object.values(LINES))

const COLORS: Record<string, string> = {
  line: '--se-line',
  quiet: '--se-line-soft',
  dark: '--se-muted',
  accent: '--se-accent',
}
const COLOR_STANDARD = 'line'

function lineOf(value: unknown): string {
  const word = typeof value === 'string' ? value : ''
  if (word in LINES) return LINES[word]
  return CSS_LINES.has(word) ? word : LINES[LINE_STANDARD]
}

function thicknessOf(value: unknown): number {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(number)) return THICKNESS_STANDARD
  return Math.min(THICKNESS_MAX, Math.max(THICKNESS_MIN, number))
}

function colorOf(value: unknown): string {
  const word = typeof value === 'string' ? value : ''
  return `var(${COLORS[word] ?? COLORS[COLOR_STANDARD]})`
}

export class Divider extends BlockElement {
  static readonly type = 'divider'
  static readonly tag = 'ff-divider'
  static readonly displayName = 'Trennlinie'
  static readonly category: Category = 'layout'

  static readonly capabilities: readonly Capability[] = []

  static readonly widthEditable = true
  static readonly heightEditable = true

  static readonly grid = { startWidth: 48, startHeight: 1, minWidth: 1, minHeight: 1 }

  static readonly blockProperties = {
    direction: segmentProperty([
      { value: 'horizontal', name: 'Waagerecht' },
      { value: 'vertical', name: 'Senkrecht' },
    ], {
      default: DIRECTION_STANDARD,
      label: 'Richtung',
      help: 'Die Linie waagerecht oder senkrecht ausrichten.',
      attribute: 'direction',
    }),
    lineStyle: choiceProperty([
      { value: 'solid', name: 'Durchgezogen' },
      { value: 'dashed', name: 'Gestrichelt' },
      { value: 'dotted', name: 'Gepunktet' },
    ], {
      default: LINE_STANDARD,
      label: 'Linienstil',
      help: 'Durchgezogen, gestrichelt oder gepunktet.',
      attribute: 'linestyle',
    }),
    thickness: numberProperty({
      default: THICKNESS_STANDARD,
      label: 'Stärke',
      help: 'Dicke der Linie in Pixeln.',
      attribute: 'thickness',
      unit: 'px',
      min: THICKNESS_MIN,
      max: THICKNESS_MAX,
    }),
    color: choiceProperty([
      { value: 'line', name: 'Standard' },
      { value: 'quiet', name: 'Dezent' },
      { value: 'dark', name: 'Dunkel' },
      { value: 'accent', name: 'Akzent' },
    ], {
      default: COLOR_STANDARD,
      label: 'Farbe',
      help: 'Farbe der Linie aus den Farben der Maske.',
      attribute: 'color',
    }),
  }

  static override styles: CSSResultGroup = [BlockElement.styles, dividerStyle]

  direction = DIRECTION_STANDARD

  lineStyle = LINE_STANDARD

  thickness: number = THICKNESS_STANDARD

  color = COLOR_STANDARD

  override render(): TemplateResult {
    const vertical = this.direction === 'vertical'
    return html`<div
      class="flaeche ${vertical ? 'vertical' : ''}"
      role="separator"
      aria-orientation=${vertical ? 'vertical' : 'horizontal'}
      style=${styleMap({
        '--strich-breite': `${thicknessOf(this.thickness)}px`,
        '--strich-stil': lineOf(this.style),
        '--strich-farbe': colorOf(this.color),
      })}
    ><div class="linie"></div></div>`
  }
}

BlockElement.defineAndRegister(Divider)
