import { deepClone } from '../../kern/deepClone'
import { Subject } from './Subject'

export interface VorlagenEintrag { id: string }

export class VorlagenStore<T extends VorlagenEintrag> extends Subject<VorlagenStore<T>> {
  private _eintraege: T[]
  private _version = 0
  private _vonHandGeaendert = false

  constructor(bestand: readonly T[] = []) {
    super()
    this._eintraege = deepClone(bestand) as T[]
  }

  get list(): readonly T[] { return this._eintraege }
  get version(): number { return this._version }

  // Nur wer von Hand geaendert hat, darf die Sicherung des Datencenters
  // aermer machen; ein leerer Start darf sie nicht anfassen (persistence.ts).
  get vonHandGeaendert(): boolean { return this._vonHandGeaendert }

  get(id: string): T | undefined {
    return this._eintraege.find((e) => e.id === id)
  }

  // Wer Aenderungen zuruecknehmen will, bekommt den Ruf VOR jeder Aenderung.
  private vorAenderung = new Set<() => void>()

  beobachteVorAenderung(fn: () => void): () => void {
    this.vorAenderung.add(fn)
    return () => { this.vorAenderung.delete(fn) }
  }

  private meldeVorAenderung(): void {
    this._vonHandGeaendert = true
    for (const fn of [...this.vorAenderung]) fn()
  }

  override notify(data: VorlagenStore<T>): void {
    this._version++
    super.notify(data)
  }

  add(data: Omit<T, 'id'>): T {
    const eintrag = { ...deepClone(data), id: crypto.randomUUID() } as T
    this.meldeVorAenderung()
    this._eintraege = [...this._eintraege, eintrag]
    this.notify(this)
    return eintrag
  }

  update(id: string, data: Omit<T, 'id'>): void {
    const at = this._eintraege.findIndex((e) => e.id === id)
    if (at < 0) return
    const naechste = [...this._eintraege]
    naechste[at] = { ...deepClone(data), id } as T
    this.meldeVorAenderung()
    this._eintraege = naechste
    this.notify(this)
  }

  ersetzeAlle(eintraege: readonly T[]): void {
    // Leer auf leer ist keine Aenderung: eine Maskendatei oder Notfallkopie
    // ohne Datencenter darf das gesicherte nicht als geleert gelten lassen.
    if (eintraege.length === 0 && this._eintraege.length === 0) return
    this.meldeVorAenderung()
    this._eintraege = deepClone(eintraege) as T[]
    this.notify(this)
  }

  remove(id: string): void {
    const naechste = this._eintraege.filter((e) => e.id !== id)
    if (naechste.length === this._eintraege.length) return
    this.meldeVorAenderung()
    this._eintraege = naechste
    this.notify(this)
  }

}
