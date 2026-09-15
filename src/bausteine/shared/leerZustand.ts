// Was ein Baustein zeigt, wenn seine Quelle keine Zeile liefert.
import { css, html, nothing, type TemplateResult } from 'lit'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'

export const LEER_TEXT_STANDARD = 'Keine Datensätze.'

export function leerTextProperty(): Eigenschaft {
  return {
    attributeName: 'leerText',
    name: 'Text ohne Datensätze',
    description: 'Text, wenn die Quelle keine Zeilen liefert. Leer: gar nichts.',
    kind: 'text',
    requiresDataSource: true,
  }
}

export function leerZustand(text: string, tafel = false): TemplateResult | typeof nothing {
  if (text.trim() === '') return nothing
  return html`<div class="leer${tafel ? ' leer--tafel' : ''}">
    <span>${text}</span>
  </div>`
}

export const leerStil = css`
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
