// Warum eine gebundene Stelle leer bleibt, in Worten fuer den Bediener.
import { quelleIdVon } from '../faehigkeiten/quelle'
import { zerlegeBindung } from '../../kern/maske/bausteinArt'
import { feldLesen, type LaufzeitQuelle } from '../../softengine/data'
import { laufzeitQuelle, zeilenDerQuelle } from '../../softengine/laufzeitQuellen'
import { ersteZeileNachAuswahl } from '../faehigkeiten/auswahl'
import { macheFeldLeser } from '../faehigkeiten/fremdeQuellen'

export type GebundeneStelle =

  | { art: 'ungebunden' }
  // Gebunden, aber die Quelle steckt nicht in der Maske. Der Export blockt das
  // nicht, der Fall erreicht also die laufende Maske.
  | { art: 'ohneQuelle' }
  // Quelle da, aber keine Zeile: nichts gewaehlt oder kein Partner in der
  // eigenen Quelle.
  | { art: 'ohneZeile' }
  | {
    art: 'wert'
    wert: string
    zeile: unknown
    quelle: LaufzeitQuelle

    quelleId: string
    reinerCode: string
  }

export function leseGebundeneStelle(el: HTMLElement, bindungsAttr: string): GebundeneStelle {
  const eigeneQuelle = quelleIdVon(el)
  const code = el.getAttribute(bindungsAttr) ?? ''
  if (eigeneQuelle === '' || code === '') return { art: 'ungebunden' }

  const quelle = laufzeitQuelle(eigeneQuelle)
  if (!quelle) return { art: 'ohneQuelle' }

  const zeile = ersteZeileNachAuswahl(el, zeilenDerQuelle(quelle))
  if (zeile === undefined) return { art: 'ohneZeile' }

  const { quelleId, code: reinerCode } = zerlegeBindung(code)

  const wert = quelleId === ''
    ? feldLesen(zeile, reinerCode)
    : macheFeldLeser(el)(zeile, code)
  return { art: 'wert', wert, zeile, quelle, quelleId, reinerCode }
}
