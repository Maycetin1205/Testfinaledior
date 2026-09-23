import { css, unsafeCSS } from 'lit'
import { choiceProperty, type Property } from '../../core/block/property'
import { TONES, toneOptions } from '../../core/block/tones'

export { toneValue } from '../../core/block/tones'

export function toneProperty(attribute = 'tone'): Property<string> {
  return choiceProperty(toneOptions(), {
    default: 'info',
    label: 'Bedeutung',
    attribute,
  })
}

export const toneStyle = css`${unsafeCSS(TONES
  .map((f) => `.v-${f.value} { --fw-stark: var(${f.strong}); --fw-sanft: var(${f.soft}); }`)
  .join('\n  '))}`
