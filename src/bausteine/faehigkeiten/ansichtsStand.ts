// Der Stand, in dem die Tabelle dasteht: Suchtext, Sortierung, Seite, Messung, Fokus.
import {
  beobachteRumpf,
  gemessenesMass,
  kopfHoehe,
  OHNE_RUMPF,
  rumpfHoehe,
  type MessZiel,
  type Zeilenmass,
} from './seitengroesse'
import { fokussierterRohIndex, stelleZeilenFokusHer } from './zeilenAktivierung'
import { gemerkteSortierung } from './sortierung'

export interface AnsichtsWirt {
  baustein: HTMLElement & MessZiel

  editable: () => boolean

  zeilenHoehe: () => number

  melde: () => void

  // Die volle Liste: die gemerkte Sortierung haengt an der Kennung, nicht am
  // Platz, und wird beim Lesen zurueckuebersetzt.
  spalten: () => readonly { kennung: string }[]

  merktSortierung: () => boolean
}

export class AnsichtsStand {
  private readonly wirt: AnsichtsWirt

  private _suchtext = ''

  private _sortSpalte = -1
  private _sortAuf = true
  private _gemerkteGelesen = false

  private _seite = 0

  private _mass: Zeilenmass | null = null
  private _beobachter: ResizeObserver | null = null

  private _taktGemessen = 0

  private _rumpfGemessen = OHNE_RUMPF

  private _kopfGemessen = 0

  private _fokusZeile: number | null = null
  private _fokusHolen = false

  constructor(wirt: AnsichtsWirt) {
    this.wirt = wirt
  }

  get suchtext(): string {
    return this._suchtext
  }

  get suchtAktiv(): boolean {
    return this._suchtext.trim() !== ''
  }

  // Erst beim ersten Lesen aus dem Speicher: der Schluessel braucht Maskenname
  // und fertiges Dokument.
  private holeGemerkte(): void {
    if (this._gemerkteGelesen) return
    this._gemerkteGelesen = true
    if (!this.wirt.merktSortierung()) return
    const stand = gemerkteSortierung.lies(this.wirt.baustein)
    if (stand === null) return
    // Die gemerkte Spalte kann es nicht mehr geben; dann bleibt die Tabelle
    // unsortiert, statt auf gut Glueck eine andere zu nehmen.
    const platz = this.wirt.spalten().findIndex((s) => s.kennung === stand.kennung)
    if (platz < 0) return
    this._sortSpalte = platz
    this._sortAuf = stand.auf
  }

  private merkeSortierung(): void {
    if (!this.wirt.merktSortierung()) return
    const kennung = this.wirt.spalten()[this._sortSpalte]?.kennung ?? ''
    gemerkteSortierung.merke(
      this.wirt.baustein,
      this._sortSpalte < 0 || kennung === '' ? null : { kennung, auf: this._sortAuf },
    )
  }

  get sortSpalte(): number {
    this.holeGemerkte()
    return this._sortSpalte
  }

  get sortAuf(): boolean {
    this.holeGemerkte()
    return this._sortAuf
  }

  get seite(): number {
    return this._seite
  }

  get mass(): Zeilenmass | null {
    return this._mass
  }

  setzeSuchtext(text: string): void {
    this.merkeZeilenFokus()
    this._suchtext = text
    this._seite = 0
    this.wirt.melde()
  }

  klickSortiere(index: number): void {
    if (this.wirt.editable()) return
    this.merkeZeilenFokus()
    // Erst den gemerkten Stand holen, sonst faenge der erste Klick bei
    // „unsortiert“ an und drehte die Richtung nicht um.
    this.holeGemerkte()
    if (this._sortSpalte === index) {
      this._sortAuf = !this._sortAuf
    } else {
      this._sortSpalte = index
      this._sortAuf = true
    }
    this._seite = 0
    this.merkeSortierung()
    this.wirt.melde()
  }

  blaettere(zu: number): void {
    this.merkeZeilenFokus()
    this._seite = zu
    this.wirt.melde()
  }

  fokussiereSuche(): boolean {
    const feld = this.wirt.baustein.shadowRoot
      ?.querySelector<HTMLInputElement>('.suchzeile input')
    if (!feld) return false
    feld.focus()
    return true
  }

  private merkeZeilenFokus(): void {
    const roh = fokussierterRohIndex(this.wirt.baustein.shadowRoot)
    this._fokusHolen = roh !== undefined
    this._fokusZeile = roh ?? null
  }

  private messeRumpf(): void {
    const takt = this.wirt.zeilenHoehe()
    this._taktGemessen = takt
    const { mass, hoehe, kopf } = gemessenesMass(this.wirt.baustein, takt)
    this._rumpfGemessen = hoehe
    this._kopfGemessen = kopf
    if (mass?.passen === this._mass?.passen && mass?.zeilenHoehe === this._mass?.zeilenHoehe) return
    this._mass = mass
    this.wirt.melde()
  }

  beobachte(): void {
    if (this._beobachter) return
    this._beobachter = beobachteRumpf(this.wirt.baustein, () => this.messeRumpf())
    if (this._beobachter) this.messeRumpf()
  }

  nachRendern(): void {
    // Den Kopf sieht der ResizeObserver nie; ohne den Vergleich bleibt eine
    // Zeile zu viel gerechnet.
    if (this._taktGemessen !== this.wirt.zeilenHoehe()
      || this._rumpfGemessen !== rumpfHoehe(this.wirt.baustein)
      || this._kopfGemessen !== kopfHoehe(this.wirt.baustein)) {
      this.messeRumpf()
    }
    if (!this._fokusHolen) return
    this._fokusHolen = false
    stelleZeilenFokusHer(this.wirt.baustein.shadowRoot, this._fokusZeile)
  }

  loese(): void {
    this._beobachter?.disconnect()
    this._beobachter = null
  }

  nachPush(): void {
    this._seite = 0
    this._mass = null
    this._taktGemessen = 0
    this._rumpfGemessen = OHNE_RUMPF
    this._kopfGemessen = 0
  }

  // Zweckwechsel: die gemerkte Sortierung zeigte auf Spalten der alten Quelle.
  zuruecksetzen(): void {
    this._suchtext = ''
    this._sortSpalte = -1
    this._sortAuf = true
    // Das erstmalige Setzen der Datenherkunft ist noch kein Zweckwechsel.
    // Vor dem ersten Lesen darf es den gespeicherten Stand nicht loeschen.
    if (this._gemerkteGelesen) this.merkeSortierung()
    this.nachPush()
    this._fokusZeile = null
    this._fokusHolen = false
  }
}
