// Die Meldungen im Balken: sammeln und wieder wegnehmen.
import { Subject } from './Subject'

// Ein Hinweis sagt, was gelungen ist; ein Fehler traegt die rote Kante.
export type MeldungsArt = 'fehler' | 'hinweis'

export interface Meldung {
  id: number
  text: string
  art: MeldungsArt
}

// Hoechstens so viele auf einmal: die aeltesten weichen, sonst wachsen die
// Kaesten aus dem Bild.
const HOECHSTENS = 5

class Meldungsstelle extends Subject<Meldungsstelle> {
  private _liste: Meldung[] = []
  private _version = 0
  private naechsteId = 1

  get liste(): readonly Meldung[] { return this._liste }
  get version(): number { return this._version }

  override notify(data: Meldungsstelle): void {
    this._version++
    super.notify(data)
  }

  melde(text: string, art: MeldungsArt = 'fehler'): void {
    this._liste = [...this._liste, { id: this.naechsteId++, text, art }].slice(-HOECHSTENS)
    this.notify(this)
  }

  schliesse(id: number): void {
    const rest = this._liste.filter((m) => m.id !== id)
    if (rest.length === this._liste.length) return
    this._liste = rest
    this.notify(this)
  }

  leere(): void {
    if (this._liste.length === 0) return
    this._liste = []
    this.notify(this)
  }
}

export const meldungen = new Meldungsstelle()
