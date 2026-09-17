// Die Rasterflaeche im DOM: welches Element sie ist und welche unter dem Zeiger liegt.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../../kern/maske/baum'
import { istRasterFlaeche } from '../../kern/maske/rasterFlaeche'
import { bausteinArt } from '../../kern/maske/registry'

// Die Flaeche der Hauptseite gehoert keinem Baustein; die Leinwand zeichnet sie
// und kennzeichnet sie damit.
export const WURZEL_FLAECHE_ATTR = 'data-ff-wurzelflaeche'

export function flaecheVon(wrapper: HTMLElement): HTMLElement | null {
  return wrapper.assignedSlot?.parentElement ?? wrapper.parentElement
}

export function flaecheIn(host: Element | null | undefined): HTMLElement | null {
  const slot = host?.shadowRoot?.querySelector('slot:not([name])')
  const flaeche = slot?.parentElement
  return flaeche instanceof HTMLElement ? flaeche : null
}

export interface FlaechenTreffer {
  parentId: string
  flaeche: HTMLElement
}

// Der Baustein zeichnet seine Flaeche selbst; zu finden ist er ueber die
// Kennung, die sein Wirt auf der Leinwand traegt.
function flaecheDesBausteins(node: Baustein): HTMLElement | null {
  const tag = bausteinArt(node.typ)?.tag
  if (!tag) return null
  const wirt = document.querySelector(`[data-block-id="${CSS.escape(node.id)}"]`)
  return flaecheIn(wirt?.querySelector(tag))
}

function flaecheDerSeite(tree: Maskenbaum, seitenId: string): HTMLElement | null {
  const seite = tree[seitenId]
  if (seite && seitenId !== WURZEL_ID) return flaecheDesBausteins(seite)
  const wurzel = document.querySelector(`[${WURZEL_FLAECHE_ATTR}]`)
  return wurzel instanceof HTMLElement ? wurzel : null
}

function trifft(el: HTMLElement, x: number, y: number): boolean {
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

// Flaechen liegen ineinander. Der Baustein gehoert in die innerste unter dem
// Zeiger, sonst landet er hinter dem Behaelter, auf den der Nutzer zeigt.
export function flaecheUnterZeiger(
  tree: Maskenbaum,
  seitenId: string,
  x: number,
  y: number,
): FlaechenTreffer | null {
  const seitenFlaeche = flaecheDerSeite(tree, seitenId)
  let treffer: FlaechenTreffer | null = seitenFlaeche && trifft(seitenFlaeche, x, y)
    ? { parentId: seitenId, flaeche: seitenFlaeche }
    : null
  const suche = (id: string): void => {
    for (const kindId of tree[id]?.kinderIds ?? []) {
      const kind = tree[kindId]
      if (!kind) continue
      if (istRasterFlaeche(kind)) {
        const flaeche = flaecheDesBausteins(kind)
        if (flaeche && trifft(flaeche, x, y)) treffer = { parentId: kind.id, flaeche }
      }
      suche(kindId)
    }
  }
  suche(seitenId)
  return treffer
}
