// Haelt Tipp-Lauf und erfasste Zeilen einer Tabelle zusammen.
import type { GeschriebeneZeile, Lieferung } from '../../kern/maske/faehigkeiten'
import type { Berechnung } from '../../kern/daten/berechnung'
import { verknuepfungenVon } from '../shared/fremdeQuellen'
import { ankunftPruefen, fehlenMeldung, type FehlendeZeile } from './ankunft'
import { ErfassungsLauf } from './erfassungsLauf'
import type { ErfassungsUmfeld } from './erfassungsZeile'
import type { ErfassungsSpalte } from './erfassungsSpalte'

// Was die Lieferung an den gesendeten Zeilen entschieden hat.
export interface AnkunftsBericht {
  meldung: string

  // Die Zeilen, die wieder vorgemerkt sind, weil sie fehlten.
  fehlende: readonly string[]

  geaendert: boolean
}

export class ErfassungsAnschluss {
  readonly lauf = new ErfassungsLauf()

  // `geschrieben` traegt die Satznummer, mit der die Zeile hinausging; sie ist
  // leer, wenn die Kette keine hatte.
  private _zeilen: { kennung: string; werte: string[]; geschrieben?: { satz: string } }[] = []

  private naechsteKennung = 1

  private _zurueck: { kennung: string; platz: number } | null = null

  get korrekturPlatz(): number | null {
    return this._zurueck === null ? null : this._zurueck.platz
  }

  get zeilen(): readonly (readonly string[])[] {
    return this._zeilen.map((z) => z.werte)
  }

  private get obenKennung(): string {
    return `e${this.naechsteKennung}`
  }

  // Auch die unten getippte Zeile zaehlt mit: wer sie ausfuellt und bucht, ohne
  // vorher Enter zu druecken, bekaeme sie sonst nicht ins ERP.
  vormerkungen(umfeld: ErfassungsUmfeld): { kennung: string; werte: readonly string[] }[] {
    const alle = this._zeilen
      .filter((z) => z.geschrieben === undefined)
      .map((z) => ({ kennung: z.kennung, werte: z.werte as readonly string[] }))
    const oben = umfeld.spalten.map((_, i) => this.lauf.wertVon(umfeld, i))
    if (oben.every((w) => w === '')) return alle
    const zurueck = this._zurueck
    if (!zurueck) return [...alle, { kennung: this.obenKennung, werte: oben }]
    const platz = this._zeilen
      .slice(0, zurueck.platz)
      .filter((z) => z.geschrieben === undefined).length
    return [
      ...alle.slice(0, platz),
      { kennung: zurueck.kennung, werte: oben },
      ...alle.slice(platz),
    ]
  }

  istGeschrieben(index: number): boolean {
    return this._zeilen[index]?.geschrieben !== undefined
  }

  get schluessel(): readonly string[] {
    return this._zeilen.map((z) => z.kennung)
  }

  umfeld(
    el: HTMLElement,
    spalten: readonly ErfassungsSpalte[],
    quelleId: string,
    berechnungen: readonly Berechnung[],
  ): ErfassungsUmfeld {
    const verknuepfungen = verknuepfungenVon(el)
    return {
      baustein: el,
      spalten,
      berechnungen,
      quelleId,
      paareZu: (id) => verknuepfungen.find((v) => v.quelleId === id)?.keyPairs ?? [],
      partnerVon: (id) => verknuepfungen.find((v) => v.quelleId === id)?.partnerId ?? '',
    }
  }

  erfasse(umfeld: ErfassungsUmfeld): boolean {
    this.lauf.rechne(umfeld)
    const werte = umfeld.spalten.map((_, i) => this.lauf.wertVon(umfeld, i))
    const zurueck = this._zurueck
    if (werte.every((w) => w === '')) {
      if (!zurueck) return false
      this._zurueck = null
      this.lauf.zuruecksetzen()
      return true
    }
    if (zurueck) {
      this._zeilen = [
        ...this._zeilen.slice(0, zurueck.platz),
        { kennung: zurueck.kennung, werte },
        ...this._zeilen.slice(zurueck.platz),
      ]
      this._zurueck = null
    } else {
      this._zeilen = [...this._zeilen, { kennung: this.obenKennung, werte }]
      this.naechsteKennung += 1
    }
    this.lauf.zuruecksetzen()
    return true
  }

  zurueckholen(umfeld: ErfassungsUmfeld, index: number): boolean {
    const zeile = this._zeilen[index]
    if (!zeile || zeile.geschrieben !== undefined) return false
    this.erfasse(umfeld)
    const jetzt = this._zeilen.indexOf(zeile)
    if (jetzt === -1) return false
    this._zeilen = this._zeilen.filter((_, i) => i !== jetzt)
    this._zurueck = { kennung: zeile.kennung, platz: jetzt }
    this.lauf.uebernimmWerte(umfeld, zeile.werte)
    return true
  }

  entferne(index: number): boolean {
    if (index < 0 || index >= this._zeilen.length) return false
    this._zeilen = this._zeilen.filter((_, i) => i !== index)
    if (this._zurueck !== null && index < this._zurueck.platz) {
      this._zurueck = { ...this._zurueck, platz: this._zurueck.platz - 1 }
    }
    return true
  }

  // Geschriebene Zeilen bleiben SICHTBAR: PUT ist Einweg und meldet keine
  // Ablehnung.
  markiereGeschrieben(umfeld: ErfassungsUmfeld, gesendet: readonly GeschriebeneZeile[]): boolean {
    if (gesendet.length === 0) return false
    const saetze = new Map(gesendet.map((g) => [g.schluessel, { satz: g.satz }]))
    let geaendert = false
    this._zeilen = this._zeilen.map((z) => {
      const marke = z.geschrieben === undefined ? saetze.get(z.kennung) : undefined
      if (marke === undefined) return z
      geaendert = true
      return { ...z, geschrieben: marke }
    })
    const zurueck = this._zurueck
    const obenMarke = saetze.get(zurueck === null ? this.obenKennung : zurueck.kennung)
    if (obenMarke === undefined) return geaendert
    const werte = umfeld.spalten.map((_, i) => this.lauf.wertVon(umfeld, i))
    if (zurueck !== null) {
      this._zeilen = [
        ...this._zeilen.slice(0, zurueck.platz),
        { kennung: zurueck.kennung, werte, geschrieben: obenMarke },
        ...this._zeilen.slice(zurueck.platz),
      ]
      this._zurueck = null
      this.lauf.zuruecksetzen()
      return true
    }
    if (werte.every((w) => w === '')) return geaendert
    this._zeilen = [...this._zeilen, { kennung: this.obenKennung, werte, geschrieben: obenMarke }]
    this.naechsteKennung += 1
    this.lauf.zuruecksetzen()
    return true
  }

  // Die gesendete Zeile geht erst weg, wenn die Lieferung sie zeigt. Fehlt sie,
  // wird sie wieder vorgemerkt: sonst waere sie aus der Maske verschwunden,
  // ohne je im Beleg gestanden zu haben.
  pruefeAnkunft(lieferung: Lieferung | null, spalten: readonly ErfassungsSpalte[]): AnkunftsBericht {
    const gesendet: { platz: number; satz: string; werte: readonly string[] }[] = []
    this._zeilen.forEach((zeile, platz) => {
      const marke = zeile.geschrieben
      if (marke !== undefined) gesendet.push({ platz, satz: marke.satz, werte: zeile.werte })
    })
    if (gesendet.length === 0) return { meldung: '', fehlende: [], geaendert: false }

    // Ohne Quelle gibt es keine Lieferung, an der sich etwas beweisen liesse.
    const angekommen = lieferung === null
      ? gesendet.map(() => true)
      : ankunftPruefen(gesendet, spalten, lieferung)

    const weg = new Set<number>()
    const fehlende: string[] = []
    const gemeldet: FehlendeZeile[] = []
    gesendet.forEach((zeile, i) => {
      if (angekommen[i] === true) {
        weg.add(zeile.platz)
        return
      }
      fehlende.push(this._zeilen[zeile.platz]?.kennung ?? '')
      gemeldet.push({
        nr: zeile.satz === '' ? String(zeile.platz + 1) : zeile.satz,
        artikel: zeile.werte.find((w) => w.trim() !== '') ?? '',
      })
    })
    this._zeilen = this._zeilen
      .filter((_, platz) => !weg.has(platz))
      .map((zeile) => (fehlende.includes(zeile.kennung)
        ? { ...zeile, geschrieben: undefined }
        : zeile))
    // Die Zeile in Korrektur haengt an ihrem Platz; ueber ihr sind gerade
    // welche weggefallen.
    const zurueck = this._zurueck
    if (zurueck !== null) {
      const davor = [...weg].filter((platz) => platz < zurueck.platz).length
      if (davor > 0) this._zurueck = { ...zurueck, platz: zurueck.platz - davor }
    }
    return { meldung: fehlenMeldung(gemeldet), fehlende, geaendert: true }
  }

  zuruecksetzen(): void {
    this._zeilen = []
    this._zurueck = null
    this.lauf.zuruecksetzen()
  }
}
