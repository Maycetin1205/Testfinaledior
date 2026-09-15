// Welche Zeile dran ist, wie der Fokus dorthin kommt, was ein Klick ausloest.
import {
  auswahlFuer,
  geberIdVon,
  waehleAuswahl,
} from '../shared/auswahl'
import { meldeKettenFehler, runEvent } from '../shared/seAktionen'
import { zeilenIndexVon, zeilenMerkmalVon } from './seRuntime'

export const ZEILE_AKTIVIERT_EVENT = 'ff-zeile-aktiviert'

export interface ZeileAktiviertDetail {
  rohzeile: unknown

  rohIndex: number

  ansichtIndex: number
}

export const ROH_ATTR = 'data-ff-roh'

function sendeZeileAktiviert(el: HTMLElement, detail: ZeileAktiviertDetail): void {
  el.dispatchEvent(new CustomEvent<ZeileAktiviertDetail>(ZEILE_AKTIVIERT_EVENT, {
    detail,
    bubbles: true,
    composed: true,
  }))
}

// Die eine Stelle, die die gewaehlte Zeile haelt. Traegt die Tabelle eine
// Kennung, ist die gemeinsame Auswahl der Speicher; ohne Kennung merkt sie
// sich das Merkmal selbst. Gemerkt wird nie der Platz: ein Datenstoss
// verschiebt ihn.
export class ZeilenWahl {
  private readonly baustein: HTMLElement

  private eigenesMerkmal = ''

  // Der Platz wird je Zeilenliste einmal gesucht: das Merkmal einer Zeile
  // entsteht aus ihrem ganzen Inhalt, und gerendert wird oft.
  private letzterPlatz: { zeilen: readonly unknown[]; merkmal: string; platz: number } | null = null

  constructor(baustein: HTMLElement) {
    this.baustein = baustein
  }

  private get geberId(): string {
    return geberIdVon(this.baustein)
  }

  private get merkmal(): string {
    const id = this.geberId
    return id === '' ? this.eigenesMerkmal : zeilenMerkmalVon(this.baustein, auswahlFuer(id))
  }

  platzIn(zeilen: readonly unknown[]): number {
    const merkmal = this.merkmal
    if (merkmal === '') return -1
    const letzter = this.letzterPlatz
    if (letzter !== null && letzter.zeilen === zeilen && letzter.merkmal === merkmal) {
      return letzter.platz
    }
    const platz = zeilen.findIndex((zeile) => zeilenMerkmalVon(this.baustein, zeile) === merkmal)
    this.letzterPlatz = { zeilen, merkmal, platz }
    return platz
  }

  // Dieselbe Zeile noch einmal nimmt die Wahl zurueck. Antwort: steht sie jetzt.
  schalte(zeile: unknown): boolean {
    const merkmal = zeilenMerkmalVon(this.baustein, zeile)
    const id = this.geberId
    if (id === '') {
      this.eigenesMerkmal = this.eigenesMerkmal === merkmal ? '' : merkmal
      return this.eigenesMerkmal !== ''
    }
    waehleAuswahl(id, zeile, merkmal)
    return merkmal !== '' && zeilenMerkmalVon(this.baustein, auswahlFuer(id)) === merkmal
  }

  vergiss(): void {
    this.eigenesMerkmal = ''
    this.letzterPlatz = null
  }
}

export function fokussierterRohIndex(wurzel: ShadowRoot | null): number | null | undefined {
  const aktiv = wurzel?.activeElement
  if (!(aktiv instanceof HTMLElement)) return undefined
  const zeile = aktiv.closest<HTMLElement>('.zeile')
  if (!zeile) return undefined
  const roh = zeile.getAttribute(ROH_ATTR)
  return roh === null || roh === '' ? null : Number(roh)
}

export function bewegeZeilenFokus(von: EventTarget | null, richtung: number): boolean {
  if (!(von instanceof HTMLElement)) return false
  const zeile = von.closest<HTMLElement>('.zeile')
  const rumpf = zeile?.parentElement
  if (!zeile || !rumpf) return false
  const zeilen = [...rumpf.querySelectorAll<HTMLElement>(`.zeile[${ROH_ATTR}]`)]
  const at = zeilen.indexOf(zeile)
  const ziel = at === -1 ? undefined : zeilen[at + richtung]
  if (!ziel) return false
  ziel.focus()
  ziel.scrollIntoView?.({ block: 'nearest' })
  return true
}

export function fokussiereErsteZeile(von: EventTarget | null): boolean {
  if (!(von instanceof HTMLElement)) return false
  const erste = von.closest<HTMLElement>('.tabelle')
    ?.querySelector<HTMLElement>(`.zeile[${ROH_ATTR}]`)
  if (!erste) return false
  erste.focus()
  return true
}

export function fokussiereSuchzeile(von: EventTarget | null): boolean {
  if (!(von instanceof HTMLElement)) return false
  const feld = von.closest<HTMLElement>('.tabelle')
    ?.querySelector<HTMLInputElement>('.suchzeile input')
  if (!feld) return false
  feld.focus()
  return true
}

export function stelleZeilenFokusHer(wurzel: ShadowRoot | null, rohIndex: number | null): void {
  if (!wurzel) return
  const gesucht = rohIndex === null
    ? null
    : wurzel.querySelector<HTMLElement>(`.zeile[${ROH_ATTR}="${rohIndex}"]`)
  const ziel = gesucht
    ?? wurzel.querySelector<HTMLElement>(`.zeile[${ROH_ATTR}]`)
    ?? wurzel.querySelector<HTMLElement>('.koerper')
  ziel?.focus()
}

// Im Editor loest der Klick nichts davon aus: dort ist er Bedienung des Editors.
export function aktiviereZeile(
  el: HTMLElement,
  wahl: ZeilenWahl,
  rohzeilen: readonly unknown[],
  rohIndex: number | null,
  ansichtIndex: number,
): void {
  if (rohIndex === null || el.hasAttribute('data-ff-editor')) return
  const rohzeile = rohzeilen[rohIndex]
  if (rohzeile === undefined) return

  if (!wahl.schalte(rohzeile)) {
    sendeZeileAktiviert(el, { rohzeile, rohIndex: -1, ansichtIndex })
    return
  }
  sendeZeileAktiviert(el, { rohzeile, rohIndex, ansichtIndex })
  runEvent(el, 'onRowClick', { PINDEX: zeilenIndexVon(el, rohzeile) })
    .catch(meldeKettenFehler)
}

export function zeileDoppelt(
  el: HTMLElement,
  rohzeilen: readonly unknown[],
  rohIndex: number | null,
): void {
  if (rohIndex === null || el.hasAttribute('data-ff-editor')) return
  const rohzeile = rohzeilen[rohIndex]
  if (rohzeile === undefined) return
  runEvent(el, 'onRowDblClick', { PINDEX: zeilenIndexVon(el, rohzeile) })
    .catch(meldeKettenFehler)
}
