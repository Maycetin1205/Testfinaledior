import { WURZEL_ID } from '../../core/blocks/BlockData'
import { SEITEN_WECHSEL_EVENT, type SeitenWechselDetail } from '../../core/blocks/seitenWechsel'
import { NaviEintragBlock } from './NaviEintragBlock'

const verbindungen = new WeakMap<Element, () => void>()
const aktiveSeiten = new WeakMap<Element, string>()

function eintraegeVon(navi: Element): NaviEintragBlock[] {
  return Array.from(navi.querySelectorAll(NaviEintragBlock.tagName))
}

function wurzelVon(navi: Element): Element | null {
  return navi.closest('.ff-root')
}

function seitenVon(wurzel: Element): Element[] {
  return Array.from(wurzel.children).filter((el) => el.hasAttribute('data-ff-seite-id'))
}

function zielVon(wurzel: Element, seite: string): string | null {
  if (seite === WURZEL_ID) return WURZEL_ID
  return seitenVon(wurzel).some((el) => el.getAttribute('data-ff-seite-id') === seite) ? seite : null
}

function aktualisiereEintraege(navi: Element): void {
  const wurzel = wurzelVon(navi)
  if (!wurzel || navi.hasAttribute('data-ff-editor')) return
  const aktiv = aktiveSeiten.get(wurzel) ?? WURZEL_ID
  for (const eintrag of eintraegeVon(navi)) {
    const ziel = zielVon(wurzel, eintrag.seite)
    eintrag.toggleAttribute('aktiv', ziel === aktiv)
    eintrag.toggleAttribute('ungueltig', ziel === null)
  }
}

export function zeigeBreite(navi: Element): void {
  for (const eintrag of eintraegeVon(navi)) eintrag.toggleAttribute('breit', navi.hasAttribute('offen'))
}

function schalteUm(wurzel: Element, seite: string): void {
  aktiveSeiten.set(wurzel, seite)
  for (const el of Array.from(wurzel.children)) {
    if (el.hasAttribute('data-ff-seite-id')) {
      el.toggleAttribute('hidden', el.getAttribute('data-ff-seite-id') !== seite)
    } else if (el.hasAttribute('data-ff-hauptinhalt')) {
      el.toggleAttribute('hidden', seite !== WURZEL_ID)
    }
  }
  for (const navi of wurzel.querySelectorAll('ff-navi')) aktualisiereEintraege(navi)
}

export function verbindeNavi(navi: Element): void {
  trenneNavi(navi)
  const auf = (event: Event): void => {
    if (navi.hasAttribute('data-ff-editor')) return
    const detail = (event as CustomEvent<SeitenWechselDetail>).detail
    const wurzel = wurzelVon(navi)
    if (!detail || !wurzel) return
    const ziel = zielVon(wurzel, detail.seite)
    if (ziel === null) return
    schalteUm(wurzel, ziel)
    navi.removeAttribute('offen')
    zeigeBreite(navi)
  }
  const start = (): void => naviAktualisiert(navi)
  navi.addEventListener(SEITEN_WECHSEL_EVENT, auf)
  navi.ownerDocument.addEventListener('DOMContentLoaded', start, { once: true })
  verbindungen.set(navi, () => {
    navi.removeEventListener(SEITEN_WECHSEL_EVENT, auf)
    navi.ownerDocument.removeEventListener('DOMContentLoaded', start)
  })
  queueMicrotask(() => { if (navi.isConnected && verbindungen.has(navi)) start() })
}

export function trenneNavi(navi: Element): void {
  verbindungen.get(navi)?.()
  verbindungen.delete(navi)
}

export function naviAktualisiert(navi: Element): void {
  zeigeBreite(navi)
  const wurzel = wurzelVon(navi)
  if (!wurzel || navi.hasAttribute('data-ff-editor')) return
  if (!aktiveSeiten.has(wurzel)) {
    const start = eintraegeVon(navi).map((e) => zielVon(wurzel, e.seite)).find((ziel) => ziel !== null)
    schalteUm(wurzel, start ?? WURZEL_ID)
  } else {
    aktualisiereEintraege(navi)
  }
}
