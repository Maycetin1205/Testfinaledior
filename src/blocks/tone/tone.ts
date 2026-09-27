import { css, unsafeCSS } from 'lit'
import { choiceProperty, type Property } from '../../core/block/property'
import { TONES, toneOptions } from '../../core/block/tones'

export { toneValue } from '../../core/block/tones'

export function toneProperty(attribute = 'tone'): Property<string> {
  return choiceProperty(toneOptions(), {
    default: 'info',
    label: 'Ton',
    attribute,
  })
}

export const toneStyle = css`${unsafeCSS(TONES
  .map((f) => `.tone-${f.value} {`
    + ` --tone-strong: var(${f.strong}); --tone-ink: var(${f.ink}); --tone-tint: var(${f.tint});`
    + ` --tone-shell: var(${f.shell}); --tone-line: var(${f.line}); --tone-soft: var(${f.soft}); }`)
  .join('\n  '))}`
