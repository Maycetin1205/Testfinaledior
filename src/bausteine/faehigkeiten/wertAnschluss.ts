// Faehigkeit Wertanschluss: die EINE gebundene Wertstelle eines Bausteins am
// Datenstrom — gelesen, lokal geschrieben, als Zeile weitergegeben.
import { bindungsAttr } from '../../kern/maske/faehigkeiten'
import { satzIndexVon, feldSchreiben } from '../../softengine/data'
import { geberIdVon, klareAuswahl, setzeAuswahl } from './auswahl'
import { macheDatenAnschluss } from './quelle'
import { leseGebundeneStelle } from './gebundeneStelle'
import { meldeKettenFehler, runEvent } from './ereignisse'

export interface WertElement extends HTMLElement {
  wert: string

  // Gesetzt und wahr: der Baustein fuellt seinen Wert selbst (Nachschlagen).
  // Dann haelt sich der Anschluss aus dem Wert heraus.
  fuelltSelbst?: () => boolean

  pruefeEigenenWert?: () => void
}

interface Angeschlossen {
  zeile: unknown
  code: string
  pindex: string
}

const daten = new WeakMap<WertElement, Angeschlossen>()
const verdrahtet = new WeakSet<WertElement>()

function jetzigerWert(el: WertElement): string {
  return typeof el.wert === 'string' ? el.wert : ''
}

function hydriere(el: WertElement): void {
  el.pruefeEigenenWert?.()
  if (el.fuelltSelbst?.() === true) {
    daten.delete(el)
    return
  }

  const stelle = leseGebundeneStelle(el, bindungsAttr('wert'))
  if (stelle.art !== 'wert') {
    daten.delete(el)
    // Ein gebundenes Feld ist Geber seiner ANGEZEIGTEN Zeile; zeigt es keine,
    // gibt es auch keine.
    klareAuswahl(geberIdVon(el))
    if (stelle.art === 'ohneZeile') el.wert = ''
    return
  }

  const { zeile, quelle, quelleId, reinerCode, wert } = stelle
  const pindex = satzIndexVon(quelle, zeile)
  if (quelleId === '') daten.set(el, { zeile, code: reinerCode, pindex })
  else daten.delete(el)
  el.wert = wert
  // Gleiches Merkmal = stiller Ruf, darum kreist die Hydrier-Kette nicht.
  setzeAuswahl(geberIdVon(el), zeile)
}

function schreibeLokal(el: WertElement): Angeschlossen | undefined {
  const stand = daten.get(el)
  if (stand) feldSchreiben(stand.zeile, stand.code, jetzigerWert(el))
  return stand
}

function verdrahte(el: WertElement): void {
  if (verdrahtet.has(el)) return
  verdrahtet.add(el)
  el.addEventListener('input', () => { schreibeLokal(el) })
  el.addEventListener('change', () => {
    const stand = schreibeLokal(el)
    runEvent(el, 'onChange', {
      VALUE: jetzigerWert(el),
      PINDEX: stand?.pindex ?? '',
    }).catch(meldeKettenFehler)
  })
}

const anschluss = macheDatenAnschluss<WertElement>({ hydriere, verdrahte })

export const wertAngemeldet = anschluss.connect
export const wertAbgemeldet = anschluss.disconnect
