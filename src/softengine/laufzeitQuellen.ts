// Die Quellen und Zeilen der laufenden Maske, wie ein Baustein sie bekommt.
import { seFenster } from './bridge'
import { quelleAusListe, istObjekt, zeilenAusLieferung, type LaufzeitQuelle } from './data'

export function laufzeitQuelle(id: string): LaufzeitQuelle | undefined {
  return quelleAusListe(seFenster().FF_DATA_SOURCES, id)
}

export function laufzeitQuellen(): LaufzeitQuelle[] {
  const liste: unknown = seFenster().FF_DATA_SOURCES
  if (!Array.isArray(liste)) return []
  const raus: LaufzeitQuelle[] = []
  for (const eintrag of liste) {
    if (!istObjekt(eintrag) || typeof eintrag.id !== 'string') continue
    const quelle = quelleAusListe(liste, eintrag.id)
    if (quelle) raus.push(quelle)
  }
  return raus
}

export function zeilenDerQuelle(quelle: LaufzeitQuelle): unknown[] {
  return zeilenAusLieferung(seFenster().SEDATA, quelle.name, quelle.tabellenId, quelle.offenerSatz)
}
