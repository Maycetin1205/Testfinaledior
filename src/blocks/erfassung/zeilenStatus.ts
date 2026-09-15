// Woran eine Zeile gerade ist: ein Balken am linken Rand plus Klartext im title.
import type { VormerkArt } from '../../core/blocks/faehigkeiten'

export type ZeilenStatus =
  | 'gebucht'
  | 'erfasst'
  | 'geaendert'
  | 'loeschung'
  | 'schreibt'

  // Stehen bleibt sie, bis SoftEngine neue Daten liefert: ein PUT ist ein
  // Einweg-Ruf, seine Annahme sieht die Maske nicht.
  | 'geschrieben'
  | 'fehler'

export interface ZeilenZeichen {
  status: ZeilenStatus

  titel: string
}

const TITEL: Record<ZeilenStatus, string> = {
  gebucht: '',
  erfasst: 'Neu',
  geaendert: 'Geändert',
  loeschung: 'Wird gelöscht',
  schreibt: 'Wird geschrieben …',
  geschrieben: 'Hinausgeschickt',
  fehler: 'Nicht geschrieben',
}

// Getrennt von den Vormerkungen: die macht der Bediener, diese Marken der Lauf,
// und die Fehlermarke muss den Daten-Push ueberleben, den derselbe Lauf ausloest.
export class LaufStand {
  private readonly melde: () => void

  private readonly schreibend = new Map<VormerkArt, Set<string>>()

  private readonly fehler = new Map<VormerkArt, Map<string, string>>()

  constructor(melde: () => void) {
    this.melde = melde
  }

  // Ein frueherer Fehlversuch derselben Zeile faellt damit weg.
  schreibt(art: VormerkArt, kennung: string): void {
    this.fehler.get(art)?.delete(kennung)
    const liste = this.schreibend.get(art) ?? new Set<string>()
    liste.add(kennung)
    this.schreibend.set(art, liste)
    this.melde()
  }

  gescheitert(art: VormerkArt, kennung: string, meldung: string): void {
    this.schreibend.get(art)?.delete(kennung)
    const liste = this.fehler.get(art) ?? new Map<string, string>()
    liste.set(kennung, meldung)
    this.fehler.set(art, liste)
    this.melde()
  }

  // Die Fehlermarke der haengengebliebenen Zeile bleibt stehen.
  fertig(art: VormerkArt, geschrieben: readonly string[]): void {
    this.schreibend.get(art)?.clear()
    const offene = this.fehler.get(art)
    if (offene) {
      for (const kennung of geschrieben) offene.delete(kennung)
    }
    this.melde()
  }

  // Der Lauf schlaegt jede Vormerkung.
  zeigt(art: VormerkArt, kennung: string, grund: ZeilenStatus): ZeilenZeichen {
    const meldung = this.fehler.get(art)?.get(kennung)
    if (meldung !== undefined) return { status: 'fehler', titel: TITEL.fehler + ': ' + meldung }
    if (this.schreibend.get(art)?.has(kennung) === true) {
      return { status: 'schreibt', titel: TITEL.schreibt }
    }
    return { status: grund, titel: TITEL[grund] }
  }
}
