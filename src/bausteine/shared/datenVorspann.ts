// Der eine Einstieg jeder Datenanzeige: Quelle finden, Zeilen holen, Feldleser bauen.
import type { LaufzeitQuelle } from '../../softengine/data'
import { laufzeitQuelle, zeilenDerQuelle } from '../../softengine/laufzeitQuellen'
import { macheFeldLeser, type FeldLeser } from './fremdeQuellen'
import { gewaehlterTag } from './gewaehlterTag'
import { zeilenAmTag } from './tagFilter'

export interface DatenVorspann {
  quelle: LaufzeitQuelle

  zeilen: unknown[]

  lies: FeldLeser
}

// null = keine oder eine in der Maske unbekannte Quelle angeschlossen.
export function holeDatenVorspann(el: HTMLElement): DatenVorspann | null {
  const sourceId = el.getAttribute('source') ?? ''
  if (sourceId === '') return null
  const quelle = laufzeitQuelle(sourceId)
  if (!quelle) return null
  const zeilen = zeilenAmTag(
    zeilenDerQuelle(quelle),
    el.getAttribute('tagfield') ?? '',
    gewaehlterTag(),
  )
  return { quelle, zeilen, lies: macheFeldLeser(el) }
}
