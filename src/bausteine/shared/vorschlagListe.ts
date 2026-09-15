// Die Tipp-Vorschlagsliste, geteilt von Formularfeld und Erfassungszeile.
import { css, html, nothing, type TemplateResult } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { schlichtText, zeilePasst } from './textSuche'

// Mehr als acht Treffer liest niemand im Vorbeitippen.
export const VORSCHLAEGE_MAX = 8

export interface Vorschlag {
  anzeige: string

  wert: string
}

// Gesucht wird in beidem, Anzeige und gespeichertem Wert. Leer getippt heisst
// KEINE Liste: bei leerem Feld ist Enter der Weg ins grosse Fenster.
const textVergleich = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

// Erst was VORN anfaengt, dann der Rest, beides in sich alphabetisch und nach
// demselben Massstab wie die Suche.
function beginntMit(eintrag: Vorschlag, getippt: string): boolean {
  const t = schlichtText(getippt.trim())
  if (t === '') return false
  return schlichtText(eintrag.anzeige.trim()).startsWith(t)
    || schlichtText(eintrag.wert.trim()).startsWith(t)
}

function ordneVorschlaege<T extends Vorschlag>(
  treffer: readonly T[],
  getippt: string,
): T[] {
  return [...treffer].sort((a, b) => {
    const va = beginntMit(a, getippt)
    const vb = beginntMit(b, getippt)
    if (va !== vb) return va ? -1 : 1
    return textVergleich.compare(a.anzeige.trim(), b.anzeige.trim())
  })
}

export function passendeVorschlaege<T extends Vorschlag>(
  eintraege: readonly T[],
  getippt: string,
  max: number = VORSCHLAEGE_MAX,
  reihenfolgeBehalten = false,
): T[] {
  if (getippt.trim() === '') return []
  // Alle Treffer sammeln und erst dann kuerzen: sonst faellt der beste weg, nur
  // weil er in den Daten weit hinten steht.
  const treffer: T[] = []
  for (const eintrag of eintraege) {
    if (zeilePasst([eintrag.anzeige, eintrag.wert], getippt)) treffer.push(eintrag)
  }
  return (reihenfolgeBehalten ? treffer : ordneVorschlaege(treffer, getippt)).slice(0, max)
}

// Die Liste darf breiter werden als ihr Halter, bleibt links verankert und
// waechst nach links, wenn sie rechts ueber die Flaeche tritt.
function flaecheGrenzen(el: HTMLElement): { links: number; rechts: number } {
  let links = 0
  let rechts = typeof window !== 'undefined' && window.innerWidth > 0
    ? window.innerWidth
    : (typeof document !== 'undefined' && document.documentElement?.clientWidth > 0
        ? document.documentElement.clientWidth
        : 10000)

  const tabelle = el.closest?.('.tabelle')
  if (tabelle instanceof (globalThis.HTMLElement ?? Object) && typeof tabelle.getBoundingClientRect === 'function') {
    const tRect = tabelle.getBoundingClientRect()
    if (tRect.width > 0) {
      links = Math.max(links, tRect.left)
      rechts = Math.min(rechts, tRect.right)
    }
    return { links, rechts }
  }

  const wurzel = typeof el.getRootNode === 'function' ? el.getRootNode() : null
  if (wurzel instanceof (globalThis.ShadowRoot ?? Object) && (wurzel as ShadowRoot).host instanceof (globalThis.HTMLElement ?? Object)) {
    const eltern = (wurzel as ShadowRoot).host.parentElement
    if (eltern && typeof eltern.getBoundingClientRect === 'function') {
      const pRect = eltern.getBoundingClientRect()
      if (pRect.width > 0) {
        links = Math.max(links, pRect.left)
        rechts = Math.min(rechts, pRect.right)
      }
    }
  }

  return { links, rechts }
}

function richteVorschlaegeAus(el: HTMLElement): void {
  if (!el || typeof el.getBoundingClientRect !== 'function') return
  const eltern = el.parentElement
  if (!eltern) return

  el.style.maxWidth = ''

  const halterRect = typeof eltern.getBoundingClientRect === 'function'
    ? eltern.getBoundingClientRect()
    : { left: 0, right: 0, width: 0 }
  const halterBreite = eltern.offsetWidth || halterRect.width || 0
  const halterLinks = halterRect.left || 0
  const halterRechts = halterRect.right || (halterLinks + halterBreite)

  const bedarf = el.offsetWidth || (typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect().width : 0)
  if (bedarf <= 0) return

  const grenzen = flaecheGrenzen(el)
  const waereRechts = halterLinks + bedarf

  const nachLinks = waereRechts > grenzen.rechts
  el.classList.toggle('nach-links', nachLinks)

  const maxBreite = nachLinks
    ? Math.max(halterBreite, halterRechts - grenzen.links)
    : Math.max(halterBreite, grenzen.rechts - halterLinks)

  if (maxBreite > 0 && Number.isFinite(maxBreite)) {
    el.style.maxWidth = `${Math.floor(maxBreite)}px`
  }
}

export function vorschlagListeTpl(args: {
  eintraege: readonly Vorschlag[]

  marke: number

  onWaehlen: (index: number) => void

  onMarke: (index: number) => void
}): TemplateResult {
  // mousedown abfangen: sonst verliert das Feld den Fokus, bevor der Klick
  // ankommt, und das Verlassen raeumt die Liste ab.
  return html`<ul
    class="vorschlaege"
    ${ref((el) => {
      if (el && 'classList' in el && 'style' in el) {
        richteVorschlaegeAus(el as HTMLElement)
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            if ((el as HTMLElement).isConnected) richteVorschlaegeAus(el as HTMLElement)
          })
        }
      }
    })}
    @mousedown=${(e: MouseEvent) => e.preventDefault()}
  >${args.eintraege.map((eintrag, i) => html`<li
      class=${i === args.marke ? 'vorschlag marke' : 'vorschlag'}
      @click=${() => args.onWaehlen(i)}
      @mouseenter=${() => args.onMarke(i)}
    ><span class="vorschlag-anzeige">${eintrag.anzeige !== '' ? eintrag.anzeige : eintrag.wert}</span>${
      eintrag.wert !== '' && eintrag.wert !== eintrag.anzeige
        ? html`<span class="vorschlag-wert">${eintrag.wert}</span>`
        : nothing
    }</li>`)}</ul>`
}

// Der Halter der Liste braucht position: relative und muss ueber seinen
// Nachbarn liegen; das steht beim jeweiligen Baustein.
export const vorschlagStil = css`
  .vorschlaege {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 3;
    width: max-content;
    min-width: 100%;
    box-sizing: border-box;
    max-height: 240px;
    overflow: auto;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
    background: var(--se-panel);
    border: var(--se-border) solid var(--se-accent);
    border-radius: var(--se-r-md);
    font-family: var(--se-font);
    font-size: var(--se-fs);
    color: var(--se-ink);
  }

  .vorschlaege.nach-links {
    left: auto;
    right: 0;
  }

  .vorschlag {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--se-gap);
    padding: 4px 10px;
    white-space: nowrap;
    cursor: pointer;
  }
  .vorschlag + .vorschlag { border-top: 1px solid var(--se-line-soft); }

  .vorschlag-anzeige { overflow: hidden; text-overflow: ellipsis; }

  .vorschlag-wert {
    flex: none;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
  }

  .vorschlag.marke { background: var(--se-accent-soft); }
`
