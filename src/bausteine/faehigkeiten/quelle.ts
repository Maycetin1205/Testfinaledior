// Faehigkeit Quelle: der Anschluss eines Bausteins an seine Datenquelle, vom
// Datenstrom bis zu den Zeilen des gewaehlten Tages.
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { QUELLE_PROP } from '../../kern/maske/quelleProp'
import { feldLesen, type LaufzeitQuelle } from '../../softengine/data'
import { starteSe, hatSeDaten, onSeDaten } from '../../softengine/bridge'
import { laufzeitQuelle, zeilenDerQuelle } from '../../softengine/laufzeitQuellen'
import { aufAuswahlHoeren } from './auswahl'
import { macheFeldLeser, type FeldLeser } from './fremdeQuellen'
import { aufTagHoeren, gewaehlterTag, tagSchluessel } from './gewaehlterTag'
import { verdrahteHolendeQuellen } from './holendeQuellen'

// Die Eigenschaft heisst wie das Attribut; Lit schreibt Attribute klein.
const QUELLE_ATTR = QUELLE_PROP.toLowerCase()

const TAG_FELD_PROP = 'tagFeld'
const TAG_FELD_ATTR = TAG_FELD_PROP.toLowerCase()

export function quelleIdVon(el: Element): string {
  return el.getAttribute(QUELLE_ATTR) ?? ''
}

export function tagFeldEigenschaft(): Eigenschaft {
  return {
    schluessel: TAG_FELD_PROP,
    name: 'Tag filtern nach',
    beschreibung: 'Datumsfeld. Gesetzt: nur Sätze des gewählten Tages.',
    art: 'field',
  }
}

export function zeilenAmTag(
  rows: readonly unknown[],
  tagCode: string,
  tag: string,
): unknown[] {
  if (tagCode === '' || tag === '') return [...rows]
  return rows.filter((row) => tagSchluessel(feldLesen(row, tagCode)) === tag)
}

export interface DatenVorspann {
  quelle: LaufzeitQuelle

  zeilen: unknown[]

  lies: FeldLeser
}

// null = keine oder eine in der Maske unbekannte Quelle angeschlossen.
export function holeDatenVorspann(el: HTMLElement): DatenVorspann | null {
  const quelleId = quelleIdVon(el)
  if (quelleId === '') return null
  const quelle = laufzeitQuelle(quelleId)
  if (!quelle) return null
  const zeilen = zeilenAmTag(
    zeilenDerQuelle(quelle),
    el.getAttribute(TAG_FELD_ATTR) ?? '',
    gewaehlterTag(),
  )
  return { quelle, zeilen, lies: macheFeldLeser(el) }
}

export interface DatenAnschluss<T extends HTMLElement> {
  connect: (el: T) => void

  disconnect: (el: T) => void
}

export function macheDatenAnschluss<T extends HTMLElement>(opts: {
  // Ein Auswahlwechsel, ein Tageswechsel oder ein Anstoss nach dem Schreiben
  // sind KEINE Lieferung; wer daran etwas verwirft, verwirft es ohne Beweis.
  hydriere: (el: T, lieferung: boolean) => void

  verdrahte?: (el: T) => void
}): DatenAnschluss<T> {
  const elemente = new Set<T>()
  let angemeldet = false

  const hydriereAlle = (lieferung: boolean): void => {
    if (!hatSeDaten()) return
    elemente.forEach((el) => { opts.hydriere(el, lieferung) })
  }

  const connect = (el: T): void => {
    if (el.hasAttribute('data-ff-editor')) return
    elemente.add(el)
    opts.verdrahte?.(el)

    if (!angemeldet) {
      angemeldet = true
      onSeDaten(hydriereAlle)

      aufTagHoeren(() => { hydriereAlle(false) })

      aufAuswahlHoeren(() => { hydriereAlle(false) })

      verdrahteHolendeQuellen()
    }
    starteSe()

    if (hatSeDaten()) opts.hydriere(el, false)
  }

  const disconnect = (el: T): void => {
    elemente.delete(el)
  }

  return { connect, disconnect }
}
