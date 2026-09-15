// Die eine Stelle fuer eine Ja/Nein-Eigenschaft im Inspector.
import type { Eigenschaft } from '../../kern/maske/eigenschaft'

// Die eine Stelle fuer eine Ja/Nein-Eigenschaft. Die REIHENFOLGE der Optionen
// ist ein Kontrakt: erste = aus, zweite = ein; der Inspector liest sie hier heraus.
export function jaNeinProperty(
  schluessel: string,
  name: string,
  description: string,
  extra?: Partial<Eigenschaft>,
): Eigenschaft {
  return {
    schluessel,
    name,
    beschreibung: description,
    art: 'jaNein',
    optionen: [
      { wert: 'nein', name: 'Nein' },
      { wert: 'ja', name: 'Ja' },
    ],
    ...extra,
  }
}
