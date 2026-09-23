import { css, html, nothing, type TemplateResult } from 'lit'
import { textProperty, type Property } from '../../core/block/property'

export const EMPTY_TEXT_STANDARD = 'Keine Datensätze.'

export function emptyTextProperty(): Property<string> {
  return textProperty({
    default: EMPTY_TEXT_STANDARD,
    label: 'Text ohne Datensätze',
    attribute: 'emptytext',
    needsSource: true,
  })
}

export function emptyState(text: string, board = false): TemplateResult | typeof nothing {
  if (text.trim() === '') return nothing
  return html`<div class="leer${board ? ' leer--tafel' : ''}">
    <span>${text}</span>
  </div>`
}

export const emptyStyle = css`
  .leer {
    display: grid;
    justify-items: center;
    gap: 7px;
    padding: 22px 14px 24px;
    border: var(--se-border) dashed var(--se-line);
    border-radius: var(--se-r-md);
    color: var(--se-muted);
    font-size: var(--se-fs);
    line-height: 1.4;
    text-align: center;
  }

  .leer--tafel {
    border: none;
    padding: 44px 20px 48px;
  }
`
