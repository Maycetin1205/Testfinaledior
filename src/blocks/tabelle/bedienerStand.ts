// Was der Bediener an EINER Tabelle eingestellt hat, im Browserspeicher.
import { BAUSTEIN_ID_ATTR } from '../../core/data/aktionen'

export interface BedienerStand<T> {
  lies: (el: HTMLElement, kennung?: string) => T | null

  merke: (el: HTMLElement, stand: T | null) => void
}

// Je Maske und Tabelle eigen; nicht jede Tabelle traegt eine Baustein-Kennung,
// darum der Platz im Dokument als Rueckfall.
function schluesselVon(vorsatz: string, el: HTMLElement, kennung?: string): string {
  const titel = typeof document === 'undefined' ? '' : document.title
  const id = kennung ?? el.getAttribute(BAUSTEIN_ID_ATTR)
  if (id !== null && id !== '') return `${vorsatz}${titel}|${id}`
  const gleiche = Array.from(el.ownerDocument?.querySelectorAll(el.tagName) ?? [])
  return `${vorsatz}${titel}|#${Math.max(0, gleiche.indexOf(el))}`
}

// `deute` wirft fremde oder alte Staende weg: sie duerfen die Tabelle nicht
// umwerfen. Faellt der Browserspeicher aus, haelt der Stand die Sitzung.
export function macheBedienerStand<T>(
  vorsatz: string,
  deute: (roh: unknown) => T | null,
): BedienerStand<T> {
  const imGedaechtnis = new Map<string, T | null>()

  const lies = (el: HTMLElement, kennung?: string): T | null => {
    const schluessel = schluesselVon(vorsatz, el, kennung)
    if (imGedaechtnis.has(schluessel)) return imGedaechtnis.get(schluessel) ?? null
    try {
      const roh = localStorage.getItem(schluessel)
      return roh === null ? null : deute(JSON.parse(roh))
    } catch {
      return null
    }
  }

  const merke = (el: HTMLElement, stand: T | null): void => {
    const schluessel = schluesselVon(vorsatz, el)
    imGedaechtnis.set(schluessel, stand)
    try {
      if (stand === null) localStorage.removeItem(schluessel)
      else localStorage.setItem(schluessel, JSON.stringify(stand))
    } catch { /* dann gilt er fuer die Sitzung */ }
  }

  return { lies, merke }
}
