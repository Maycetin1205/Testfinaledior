// Suchtreffer in einem Zellwert hervorheben.
import { html, type TemplateResult } from 'lit'
import { woerterVon } from '../shared/textSuche'

const SONDERZEICHEN = /[.*+?^${}()|[\]\\]/g

// Gebaut wird ein BAUM aus Text und <mark>, nie ein HTML-String: ein Wert aus
// dem ERP darf nicht als Markup gelesen werden.
export function markiereTreffer(text: string, suchtext: string): TemplateResult | string {
  const woerter = woerterVon(suchtext)
  if (woerter.length === 0 || text === '') return text

  let muster: RegExp
  try {
    muster = new RegExp(`(${woerter.map((w) => w.replace(SONDERZEICHEN, '\\$&')).join('|')})`, 'ig')
  } catch {
    return text
  }

  // split mit Fanggruppe: an den ungeraden Stellen stehen die Treffer.
  const teile = text.split(muster)
  if (teile.length <= 1) return text
  return html`${teile.map((teil, i) => (i % 2 === 1 ? html`<mark>${teil}</mark>` : teil))}`
}
