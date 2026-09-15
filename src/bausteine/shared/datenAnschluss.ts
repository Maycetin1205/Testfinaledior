// Der gemeinsame Anschluss eines Bausteins an den SoftEngine-Datenstrom.
import { bootSe, hasSeData, onSeDaten } from '../../softengine/bridge'
import { aufAuswahlHoeren } from './auswahl'
import { aufTagHoeren } from './gewaehlterTag'
import { verdrahteHolendeQuellen } from './holendeQuellen'

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
    if (!hasSeData()) return
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
    bootSe()

    if (hasSeData()) opts.hydriere(el, false)
  }

  const disconnect = (el: T): void => {
    elemente.delete(el)
  }

  return { connect, disconnect }
}
