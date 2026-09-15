// Die weiteren Quellen eines Bausteins: welcher Satz zu einer Zeile gehoert.
import { feldLesen } from '../../softengine/data'
import { laufzeitQuelle, zeilenDerQuelle } from '../../softengine/laufzeitQuellen'
import { WEITERE_QUELLEN_PROP, type SchluesselPaar } from '../../kern/daten/weitereQuellen'
import { zerlegeBindung } from '../../kern/maske/bausteinArt'
import { paarListeAusAttribut } from './paarListe'

const WEITERE_QUELLEN_ATTR = WEITERE_QUELLEN_PROP.toLowerCase()

export type FeldLeser = (row: unknown, wert: string) => string

interface Nachschlag {
  nachSchluessel: Map<string, unknown>

  // Die Quelle, deren Felder den Schluessel liefern. Leer = die Hauptquelle.
  partnerId: string

  hierFelder: string[]
}

const SCHLUESSEL_TRENNER = '\x01'

function schluesselAus(werte: readonly string[]): string {
  if (werte.length === 0) return ''
  const teile: string[] = []
  for (const w of werte) {
    const t = w.trim()
    if (t === '') return ''
    teile.push(t)
  }
  return teile.join(SCHLUESSEL_TRENNER)
}

// Je Quelle die Schluesselpaare und die Quelle, mit der sie verbinden.
// Eintraege OHNE Paar bleiben stehen: eine Quelle ohne Paar ist eine reine
// Nachschlagequelle.
export function verknuepfungenVon(
  el: HTMLElement,
): { quelleId: string; partnerId: string; paare: SchluesselPaar[] }[] {
  return paarListeAusAttribut(el, WEITERE_QUELLEN_ATTR, 'quelleId', { ohnePaareBehalten: true })
    .map((e) => ({ quelleId: e.id, partnerId: e.partnerId, paare: e.paare }))
}

export function macheFeldLeser(el: HTMLElement): FeldLeser {
  const weitere = verknuepfungenVon(el)
  if (weitere.length === 0) return (row, wert) => feldLesen(row, zerlegeBindung(wert).code)

  const nachschlag = new Map<string, Nachschlag>()

  for (const q of weitere) {
    if (q.paare.length === 0) continue
    const source = laufzeitQuelle(q.quelleId)
    if (!source) continue
    const zeilen = zeilenDerQuelle(source)
    const nachSchluessel = new Map<string, unknown>()
    for (const zeile of zeilen) {
      const key = schluesselAus(q.paare.map((p) => feldLesen(zeile, p.nachFeld)))
      if (key !== '' && !nachSchluessel.has(key)) nachSchluessel.set(key, zeile)
    }
    nachschlag.set(q.quelleId, {
      nachSchluessel,
      partnerId: q.partnerId,
      hierFelder: q.paare.map((p) => p.vonFeld),
    })
  }

// Leere Kennung = die Zeile selbst. Sonst wird erst der Satz der PARTNER-Quelle
// geholt, dessen Felder liefern den Schluessel; so traegt eine Kette genauso wie
// ein Stern. `laufend` bricht einen Kreis ab, statt die Maske haengen zu lassen.
  const satzVon = (quelleId: string, row: unknown, laufend: Set<string>): unknown => {
    if (quelleId === '') return row
    const eintrag = nachschlag.get(quelleId)
    if (!eintrag || laufend.has(quelleId)) return undefined
    laufend.add(quelleId)
    const partner = satzVon(eintrag.partnerId, row, laufend)
    laufend.delete(quelleId)
    if (partner === undefined) return undefined
    const key = schluesselAus(eintrag.hierFelder.map((f) => feldLesen(partner, f)))
    return key === '' ? undefined : eintrag.nachSchluessel.get(key)
  }

  return (row, wert) => {
    const { quelleId, code } = zerlegeBindung(wert)
    if (quelleId === '') return feldLesen(row, code)
    const satz = satzVon(quelleId, row, new Set())
    return satz === undefined ? '' : feldLesen(satz, code)
  }
}
