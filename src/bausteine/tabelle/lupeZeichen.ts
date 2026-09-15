// Das Lupen-Zeichen fuer Nachschlage-Feld und Nachschlage-Zelle.
import { html, type TemplateResult } from 'lit'

export function lupeZeichen(): TemplateResult {
  return html`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
      <line x1="10.4" y1="10.4" x2="14" y2="14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></line>
    </svg>`
}
