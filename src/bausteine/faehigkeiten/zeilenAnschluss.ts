// Die Tabelle am SoftEngine-Datenstrom: anmelden, Zeilen ableiten, Satznummer lesen.
import { faehigkeit, hatFaehigkeit, vertragVon } from '../../kern/maske/faehigkeiten'
import { bausteinArtFuerTag } from '../../kern/maske/registry'
import { satzIndexVon } from '../../softengine/data'
import { laufzeitQuelle } from '../../softengine/laufzeitQuellen'
import { auswahlWiederfinden, geberIdVon, merkmalVon, zeilenNachAuswahl } from './auswahl'
import { holeDatenVorspann, macheDatenAnschluss, quelleIdVon, type DatenVorspann } from './quelle'
import { berechnungenAus, ergaenzeZeile, type Berechnung } from '../../kern/daten/berechnung'
import { alsZahl } from './sortierung'
import { spalteMitKennung, tryCoerceSpalten, type Spalte } from './spalten'

export interface RuntimeTableElement extends HTMLElement {
  datenzeilen: string[][]
  rohzeilen: unknown[]
  durchAuswahlGefiltert: boolean
  datenGeliefert: boolean
}

// Wer gesendete Zeilen haelt, sagt die Registry; die Liste selbst haelt keine.
// Danach ist der Ruf unbedingt: eine gemeldete Faehigkeit ohne Vertrag faellt
// auf, statt still nichts zu tun.
function pruefeAnkunft(el: HTMLElement, vorspann: DatenVorspann | null): void {
  if (!hatFaehigkeit(bausteinArtFuerTag(el.tagName), 'haeltGesendete')) return
  vertragVon(el, 'haeltGesendete').pruefeAnkunft(vorspann === null ? null : {
    // Vor der Auswahl gefiltert: eine Position, die der Auswahlfilter
    // wegnimmt, steht trotzdem im Beleg.
    zeilen: vorspann.zeilen,
    satzVon: (zeile) => satzIndexVon(vorspann.quelle, zeile),
    lies: vorspann.lies,
  })
}

function spaltenVon(el: HTMLElement): Spalte[] {
  return tryCoerceSpalten(el.getAttribute('spalten') ?? '')
}

// Welche Tabelle rechnet, sagt die Registry; die Berechnungen stehen als
// Eigenschaft am Element.
function berechnungenVon(el: HTMLElement): Berechnung[] {
  const prop = faehigkeit(bausteinArtFuerTag(el.tagName), 'rechnen')?.prop
  return prop === undefined ? [] : berechnungenAus((el as unknown as Record<string, unknown>)[prop])
}

// Die Zeile, wie sie kam, und in jeder leeren Ergebnisspalte das Gerechnete.
export function zeileGerechnet(
  spalten: readonly Spalte[],
  berechnungen: readonly Berechnung[],
  gegeben: (platz: number) => string,
): string[] {
  const werte = ergaenzeZeile(
    berechnungen,
    (kennung) => spalteMitKennung(spalten, kennung),
    gegeben,
    alsZahl,
  )
  return spalten.map((_, platz) => {
    const eigen = gegeben(platz)
    return eigen !== '' ? eigen : werte.get(platz)?.text ?? ''
  })
}

export function zeilenIndexVon(el: HTMLElement, rohzeile: unknown): string {
  const source = laufzeitQuelle(quelleIdVon(el))
  return source ? satzIndexVon(source, rohzeile) : ''
}

export function zeilenMerkmalVon(el: HTMLElement, rohzeile: unknown): string {
  if (rohzeile == null) return ''
  const satz = zeilenIndexVon(el, rohzeile)
  return satz === '' ? merkmalVon(rohzeile) : JSON.stringify([quelleIdVon(el), satz])
}

export function hatSatzNummer(el: HTMLElement): boolean {
  const source = laufzeitQuelle(quelleIdVon(el))
  return source !== undefined && source.satzFeld !== ''
}

function hydrateTable(el: RuntimeTableElement, lieferung: boolean): void {
  const vorspann = holeDatenVorspann(el)
  // Erst die Lieferung von SoftEngine beweist den neuen Stand.
  if (lieferung) pruefeAnkunft(el, vorspann)
  if (!vorspann) {
    el.datenzeilen = []
    return
  }
  const spalten = spaltenVon(el)
  const berechnungen = berechnungenVon(el)

  const { rows, gefiltert } = zeilenNachAuswahl(el, vorspann.zeilen)

  // Ist die gewaehlte Zeile aus der Liste gefallen, faellt hier die Wahl.
  auswahlWiederfinden(geberIdVon(el), rows, (r) => r, (r) => zeilenMerkmalVon(el, r))

  const lies = vorspann.lies

  el.datenGeliefert = true
  el.rohzeilen = rows
  el.durchAuswahlGefiltert = gefiltert
  el.datenzeilen = rows.map((row) => zeileGerechnet(
    spalten,
    berechnungen,
    (platz) => {
      const feld = spalten[platz]?.feld ?? ''
      return feld === '' ? '' : lies(row, feld)
    },
  ))
}

const anschluss = macheDatenAnschluss<RuntimeTableElement>({ hydriere: hydrateTable })

export const connectTable = anschluss.connect
export const disconnectTable = anschluss.disconnect

export type Datenbesitz = 'softengine' | 'provided'

export interface BereitgestellteZeile {
  rohzeile: unknown

  zellen: readonly string[]
}

export interface AbgeleiteteZeilen {
  rohzeilen: unknown[]
  datenzeilen: string[][]
}

export function leiteZeilenAb(
  zeilen: readonly BereitgestellteZeile[],
  spalten: readonly Spalte[],
  berechnungen: readonly Berechnung[],
): AbgeleiteteZeilen {
  return {
    rohzeilen: zeilen.map((z) => z.rohzeile),
    datenzeilen: zeilen.map((z) => zeileGerechnet(spalten, berechnungen, (platz) => z.zellen[platz] ?? '')),
  }
}
