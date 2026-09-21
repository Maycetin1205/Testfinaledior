// Die Zeilen einer ERP-Abfrage nach dem Oeffnen holen und ablegen.
import { meldeAnstoss } from './bridge'
import type { LaufzeitAbfrage } from './data'
import { setzeGeholteZeilen } from './geholteZeilen'
import { abfrageAusfuehren } from './relations'

export interface AbfrageQuelle {
  id: string
  name: string
}

// Je Seite einmal: die Listen haengen an keinem Beleg. Nur eine gescheiterte
// Abfrage fragt bei der naechsten Lieferung noch einmal.
const geholt = new Set<string>()
const unterwegs = new Set<string>()

export function holeAbfrageQuelle(quelle: AbfrageQuelle, abfrage: LaufzeitAbfrage): void {
  if (geholt.has(quelle.id) || unterwegs.has(quelle.id)) return
  unterwegs.add(quelle.id)
  void (async () => {
    const antwort = await abfrageAusfuehren(abfrage, quelle.name)
    unterwegs.delete(quelle.id)
    // Den Fehler hat abfrageAusfuehren schon in den Balken gelegt.
    if (antwort.zeilen === undefined) return
    geholt.add(quelle.id)
    setzeGeholteZeilen(quelle.name, antwort.zeilen)
    meldeAnstoss()
  })()
}
