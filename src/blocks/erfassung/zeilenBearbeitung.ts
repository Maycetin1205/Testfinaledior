// Vormerkungen an gebuchten Zeilen: Zellwerte aendern, Zeilen zum Loeschen merken.
import type { Lieferung, VormerkArt } from '../../core/blocks/faehigkeiten'
import { geheInZelle, zellenFelder } from '../shared/zellenEingabe'
import { ergaenzeZeile, ergebnisPlaetze, type Berechnung } from '../../core/data/berechnung'
import { zeilenIndexVon } from '../tabelle/seRuntime'
import { alsZahl } from '../tabelle/sortierung'
import { spalteMitKennung, type Spalte } from '../tabelle/spalten'
import {
  aenderungAngekommen,
  loeschungAngekommen,
  nichtGeaendertMeldung,
  nichtGeloeschtMeldung,
  wertGleich,
  type FehlendeZeile,
} from './ankunft'
import type { LaufStand, ZeilenZeichen } from './zeilenStatus'

// Die gebuchten Zeilen, ohne die Erfassungszeile: die haengt unten und waere
// beim Wandern durch eine Spalte die falsche Nachbarin.
const GEBUCHTE_ZEILEN = '.koerper > .zeile:not(.erfassung)'

export interface ZeilenWirt {
  baustein: HTMLElement

  spalten: () => readonly Spalte[]

  berechnungen: () => readonly Berechnung[]

  rohzeilen: () => readonly unknown[]

  datenzeilen: () => readonly string[][]

  melde: () => void

  lauf: LaufStand

  fokussiereErfassungsZelle: (index: number) => void
}

// Was die Lieferung an den hinausgeschickten Vormerkungen entschieden hat.
export interface ZeilenAnkunft {
  // Satznummern, die wieder vorgemerkt sind, weil der Beleg sie nicht zeigt.
  aenderungFehlt: readonly string[]

  loeschungFehlt: readonly string[]

  meldung: string

  bewegt: boolean
}

const NICHTS_UNTERWEGS: ZeilenAnkunft = {
  aenderungFehlt: [],
  loeschungFehlt: [],
  meldung: '',
  bewegt: false,
}

export class ZeilenBearbeitung {
  private readonly wirt: ZeilenWirt

  // Sie ueberleben jeden Push: sie haengen an der Satznummer, nicht am Platz.
  private readonly aenderungen = new AenderungsSpeicher()

  private readonly geloescht = new Set<string>()

  // Hinausgeschickt, aber noch nicht bewiesen. Getrennt von den Vormerkungen,
  // damit derselbe Knopf sie nicht ein zweites Mal sendet; sichtbar bleiben sie
  // trotzdem, denn ein PUT ist Einweg und meldet keine Ablehnung.
  private readonly gesendet = new AenderungsSpeicher()

  // Was in derselben Zelle stand, BEVOR gesendet wurde. Daran entscheidet die
  // Lieferung, ob etwas geschehen ist; siehe aenderungAngekommen.
  private readonly vorherige = new AenderungsSpeicher()

  private readonly gesendeteLoeschung = new Set<string>()

  constructor(wirt: ZeilenWirt) {
    this.wirt = wirt
  }

  // Der Vertrag der Faehigkeit aenderungsSchluessel: je Zeile ihre Satznummer
  // und ALLE Spaltenwerte, damit die Kette auch unveraenderte Felder mitschreibt.
  get geaenderteZeilen(): readonly { satz: string; werte: readonly string[] }[] {
    // satzPlaetze liefe sonst bei jedem Rendern ueber alle Zeilen der Liste.
    if (this.aenderungen.anzahl === 0) return []
    const spaltenAnzahl = this.wirt.spalten().length
    const plaetze = this.satzPlaetze()
    const raus: { satz: string; werte: readonly string[] }[] = []
    for (const satz of this.aenderungen.saetze()) {
      const rohIndex = plaetze.get(satz)
      // Die Zeile ist seit der Aenderung aus der Liste verschwunden; mit leeren
      // Werten zu schreiben hiesse, den Satz im ERP leerzuraeumen.
      if (rohIndex === undefined) continue
      raus.push({
        satz,
        werte: Array.from({ length: spaltenAnzahl }, (_, spalte) => this.zellWert(rohIndex, spalte)),
      })
    }
    return raus
  }

  // Der Vertrag der Faehigkeit kannLoeschen, gleiche Form wie geaenderteZeilen.
  get geloeschteZeilen(): readonly { satz: string; werte: readonly string[] }[] {
    if (this.geloescht.size === 0) return []
    const spaltenAnzahl = this.wirt.spalten().length
    const plaetze = this.satzPlaetze()
    const raus: { satz: string; werte: readonly string[] }[] = []
    for (const satz of this.geloescht) {
      const rohIndex = plaetze.get(satz)
      if (rohIndex === undefined) continue
      raus.push({
        satz,
        werte: Array.from({ length: spaltenAnzahl }, (_, spalte) => this.zellWert(rohIndex, spalte)),
      })
    }
    return raus
  }

  // Hinausgeschickt ist nicht angekommen: die Vormerkung wird nicht geloescht,
  // sie wandert ins Wartende. Erst die Lieferung laesst sie los.
  austragen(art: VormerkArt, kennungen: readonly string[]): void {
    let weg = false
    const plaetze = art === 'geaendert' ? this.satzPlaetze() : undefined
    for (const satz of kennungen) {
      if (art === 'geaendert') {
        const rohIndex = plaetze?.get(satz)
        this.wirt.spalten().forEach((_, spalte) => {
          const wert = this.aenderungen.wert(satz, spalte)
          if (wert === undefined) return
          const vorher = rohIndex === undefined
            ? ''
            : this.wirt.datenzeilen()[rohIndex]?.[spalte] ?? ''
          // Der Wert stand schon so da: keine Lieferung koennte je zeigen, dass
          // etwas geschehen ist, und die Zeile wartete endlos.
          if (wertGleich(wert, vorher)) return
          this.gesendet.setze(satz, spalte, wert)
          this.vorherige.setze(satz, spalte, vorher)
        })
        weg = this.aenderungen.nimmSatzZurueck(satz) || weg
      } else if (this.geloescht.delete(satz)) {
        this.gesendeteLoeschung.add(satz)
        weg = true
      }
    }
    if (weg) this.wirt.melde()
  }

  // Die beiden Speicher des Wartenden gehoeren zusammen; sie einzeln zu
  // raeumen hiesse, den Beweis auf einen Wert zu stuetzen, der nicht mehr gilt.
  private vergissWartende(satz: string): void {
    this.gesendet.nimmSatzZurueck(satz)
    this.vorherige.nimmSatzZurueck(satz)
  }

  // Der Beweis. Was die Lieferung zeigt, ist durch; was sie nicht zeigt, ist
  // wieder vorgemerkt und traegt die Fehlermarke, bis der naechste Lauf es
  // noch einmal versucht.
  pruefeAnkunft(lieferung: Lieferung | null): ZeilenAnkunft {
    if (this.gesendet.anzahl === 0 && this.gesendeteLoeschung.size === 0) {
      return NICHTS_UNTERWEGS
    }
    // Ohne Quelle gibt es keine Lieferung, an der sich etwas beweisen liesse.
    if (lieferung === null) {
      this.gesendet.leere()
      this.vorherige.leere()
      this.gesendeteLoeschung.clear()
      return { ...NICHTS_UNTERWEGS, bewegt: true }
    }

    const plaetze = this.satzPlaetze()

    // Die Loeschungen zuerst: eine Zeile, die weg soll, darf nachher keine
    // Zell-Aenderung zurueckbekommen.
    const loeschungFehlt: string[] = []
    const geloeschtGemeldet: FehlendeZeile[] = []
    for (const satz of this.gesendeteLoeschung) {
      if (loeschungAngekommen(satz, lieferung)) continue
      loeschungFehlt.push(satz)
      geloeschtGemeldet.push({ nr: satz, artikel: this.artikelVon(plaetze.get(satz)) })
    }
    this.gesendeteLoeschung.clear()
    for (const satz of loeschungFehlt) this.geloescht.add(satz)

    const aenderungFehlt: string[] = []
    const geaendertGemeldet: FehlendeZeile[] = []
    for (const satz of this.gesendet.saetze()) {
      // Diese Zeile soll weg; ihre Zell-Aenderung waere nur noch im Weg, und
      // die Loeschung meldet sie ohnehin schon.
      if (this.geloescht.has(satz)) {
        this.vergissWartende(satz)
        continue
      }
      if (aenderungAngekommen(satz, this.gesendeteZellen(satz), lieferung)) {
        this.vergissWartende(satz)
        continue
      }
      aenderungFehlt.push(satz)
      geaendertGemeldet.push({ nr: satz, artikel: this.artikelVon(plaetze.get(satz)) })
    }
    // Zurueck in die Vormerkung, damit derselbe Knopf es noch einmal versucht.
    // Was der Bediener inzwischen neu getippt hat, bleibt stehen.
    for (const satz of aenderungFehlt) {
      this.wirt.spalten().forEach((_, spalte) => {
        const wert = this.gesendet.wert(satz, spalte)
        if (wert !== undefined && this.aenderungen.wert(satz, spalte) === undefined) {
          this.aenderungen.setze(satz, spalte, wert)
        }
      })
      this.vergissWartende(satz)
    }

    const meldung = [
      nichtGeaendertMeldung(geaendertGemeldet),
      nichtGeloeschtMeldung(geloeschtGemeldet),
    ].filter((text) => text !== '').join(' ')
    return { aenderungFehlt, loeschungFehlt, meldung, bewegt: true }
  }

  // Nur Spalten mit Feldcode: an einer Rechenspalte laesst sich in der
  // Lieferung nichts nachlesen.
  private gesendeteZellen(satz: string): { feld: string; vorher: string }[] {
    const raus: { feld: string; vorher: string }[] = []
    this.wirt.spalten().forEach((spalte, index) => {
      if (this.gesendet.wert(satz, index) === undefined || spalte.feld === '') return
      raus.push({ feld: spalte.feld, vorher: this.vorherige.wert(satz, index) ?? '' })
    })
    return raus
  }

  private artikelVon(rohIndex: number | undefined): string {
    if (rohIndex === undefined) return ''
    return this.wirt.spalten()
      .map((_, spalte) => this.zellWert(rohIndex, spalte))
      .find((wert) => wert.trim() !== '') ?? ''
  }

  // Was der Lauf meldet, schlaegt die Vormerkung; unter den Vormerkungen
  // schlaegt die Loeschung die Aenderung.
  statusVon(rohIndex: number): ZeilenZeichen {
    const satz = this.satzVon(rohIndex)
    if (satz === '') return { status: 'gebucht', titel: '' }
    if (this.geloescht.has(satz)) return this.wirt.lauf.zeigt('geloescht', satz, 'loeschung')
    if (this.gesendeteLoeschung.has(satz)) {
      return this.wirt.lauf.zeigt('geloescht', satz, 'geschrieben')
    }
    const spalten = this.wirt.spalten()
    if (spalten.some((_, spalte) => this.aenderungen.wert(satz, spalte) !== undefined)) {
      return this.wirt.lauf.zeigt('geaendert', satz, 'geaendert')
    }
    const unterwegs = spalten.some((_, spalte) => this.gesendet.wert(satz, spalte) !== undefined)
    return this.wirt.lauf.zeigt('geaendert', satz, unterwegs ? 'geschrieben' : 'gebucht')
  }

  // Einmal gebaut statt je Vormerkung gesucht: bei tausenden Zeilen spuerbar.
  private satzPlaetze(): Map<string, number> {
    const plaetze = new Map<string, number>()
    this.wirt.rohzeilen().forEach((zeile, index) => {
      const satz = zeilenIndexVon(this.wirt.baustein, zeile)
      if (satz !== '' && !plaetze.has(satz)) plaetze.set(satz, index)
    })
    return plaetze
  }

  private satzVon(rohIndex: number): string {
    const rohzeile = this.wirt.rohzeilen()[rohIndex]
    return rohzeile === undefined ? '' : zeilenIndexVon(this.wirt.baustein, rohzeile)
  }

  // Eine Zeile, die weg soll, braucht keine Zell-Aenderung mehr: sonst schriebe
  // derselbe Klick erst einen neuen Wert und loeschte die Zeile danach.
  schalteLoeschung(rohIndex: number): void {
    const satz = this.satzVon(rohIndex)
    if (satz === '') return
    if (this.geloescht.has(satz)) this.geloescht.delete(satz)
    // Unbewiesen hinausgeschickt: derselbe Klick nimmt das Warten zurueck.
    else if (this.gesendeteLoeschung.has(satz)) this.gesendeteLoeschung.delete(satz)
    else {
      this.geloescht.add(satz)
      this.wirt.spalten().forEach((_, spalte) => {
        this.aenderungen.nimmZurueck(satz, spalte)
      })
      // Auch eine schon hinausgeschickte: dieselbe Regel, sonst kaeme sie ueber
      // den Beweis als Aenderung an einer Zeile zurueck, die weg soll.
      this.vergissWartende(satz)
    }
    this.wirt.melde()
  }

  istGeloescht(rohIndex: number): boolean {
    const satz = this.satzVon(rohIndex)
    return satz !== '' && (this.geloescht.has(satz) || this.gesendeteLoeschung.has(satz))
  }

  zellWert(rohIndex: number, spaltenIndex: number): string {
    const satz = this.satzVon(rohIndex)
    const vorgemerkt = this.aenderungen.wert(satz, spaltenIndex)
    if (vorgemerkt !== undefined) return vorgemerkt
    // Hinausgeschickt, noch nicht bewiesen: den alten ERP-Wert zu zeigen hiesse,
    // die Aenderung waere zurueckgenommen worden.
    const unterwegs = this.gesendet.wert(satz, spaltenIndex)
    if (unterwegs !== undefined) return unterwegs
    const gerechnet = this.gerechneteZelle(rohIndex, satz, spaltenIndex)
    if (gerechnet !== null) return gerechnet
    return this.wirt.datenzeilen()[rohIndex]?.[spaltenIndex] ?? ''
  }

  // Eine Ergebnisspalte folgt dem, was JETZT in der Zeile steht; in der
  // Lieferung steht das Ergebnis von vorhin. null heisst: hier ist nichts
  // nachzurechnen — die Lieferung hat schon gerechnet, und ohne Vormerkung
  // aendert sich nichts. In einer gebuchten Zeile rechnet nur die Leitgroesse
  // nach; die uebrigen Richtungen gelten der Erfassungszeile, denn hier stehen
  // alle Werte schon da und keiner sagt, welcher weichen soll.
  private gerechneteZelle(
    rohIndex: number,
    satz: string,
    spaltenIndex: number,
  ): string | null {
    if (this.aenderungen.anzahl === 0 && this.gesendet.anzahl === 0) return null
    if (!this.aenderungen.hatSatz(satz) && !this.gesendet.hatSatz(satz)) return null
    const berechnungen = this.wirt.berechnungen()
    const spalten = this.wirt.spalten()
    const platzVon = (kennung: string): number => spalteMitKennung(spalten, kennung)
    if (!ergebnisPlaetze(berechnungen, platzVon).has(spaltenIndex)) return null
    const leitPlaetze = new Set(berechnungen.map((b) => platzVon(b.leit.spalte)))
    const zeile = this.wirt.datenzeilen()[rohIndex]
    const gerechnet = ergaenzeZeile(
      berechnungen,
      platzVon,
      (platz) => {
        const eigen = this.aenderungen.wert(satz, platz) ?? this.gesendet.wert(satz, platz)
        // Die Leitgroesse der Lieferung ist selbst gerechnet und darf die neue
        // Rechnung nicht vorwegnehmen; vorgemerkt gilt sie als Eingabe.
        return eigen ?? (leitPlaetze.has(platz) ? '' : zeile?.[platz] ?? '')
      },
      alsZahl,
    )
    return gerechnet.get(spaltenIndex)?.text ?? null
  }

  istGeaendert(rohIndex: number, spaltenIndex: number): boolean {
    const satz = this.satzVon(rohIndex)
    return this.aenderungen.wert(satz, spaltenIndex) !== undefined
      || this.gesendet.wert(satz, spaltenIndex) !== undefined
  }

  tippeZelle(rohIndex: number, spaltenIndex: number, text: string): void {
    if (this.aenderungen.setze(this.satzVon(rohIndex), spaltenIndex, text)) {
      this.wirt.melde()
    }
  }

  // Steht wieder der urspruengliche Wert da, faellt die Vormerkung weg.
  // Verglichen wird roh gegen roh, wie der ERP-Wert kommt.
  verlasseZelle(rohIndex: number, spaltenIndex: number, text: string): void {
    const satz = this.satzVon(rohIndex)
    const unterwegs = this.gesendet.wert(satz, spaltenIndex)
    if (unterwegs !== undefined) {
      // Waehrend des Wartens ist der hinausgeschickte Wert die Grundlinie, nicht
      // der ERP-Wert. Sonst hiesse ein blosser Klick durch die Zelle „geaendert",
      // und ein Ruecktippen auf den alten Wert liesse den hinausgeschickten
      // stehen, der spaeter doch noch einmal geschrieben wuerde.
      if (text === unterwegs) return
      this.gesendet.nimmZurueck(satz, spaltenIndex)
      this.vorherige.nimmZurueck(satz, spaltenIndex)
      if (this.aenderungen.setze(satz, spaltenIndex, text)) this.wirt.melde()
      return
    }
    const urspruenglich = this.wirt.datenzeilen()[rohIndex]?.[spaltenIndex] ?? ''
    const geaendert = text === urspruenglich
      ? this.aenderungen.nimmZurueck(satz, spaltenIndex)
      : this.aenderungen.setze(satz, spaltenIndex, text)
    if (geaendert) this.wirt.melde()
  }

  // Senkrecht durch DIESELBE Spalte; der Fokuswechsel loest das Verlassen der
  // alten Zelle aus. Waagerecht bleibt Tab.
  private zelleNachbar(
    spaltenIndex: number,
    von: HTMLInputElement,
    schritt: number,
    enterModus: boolean,
  ): void {
    const felder = zellenFelder(
      this.wirt.baustein.shadowRoot,
      GEBUCHTE_ZEILEN,
      spaltenIndex,
    )
    const jetzt = felder.indexOf(von)
    if (jetzt < 0) return
    let ziel = jetzt + schritt
    if (ziel > felder.length - 1) {
      // Enter unter der letzten Zeile: weiter in die Erfassungszeile.
      if (enterModus) {
        this.wirt.fokussiereErfassungsZelle(0)
        return
      }
      ziel = felder.length - 1
    }
    if (ziel < 0) ziel = 0
    const feld = felder[ziel]
    if (feld === von) return
    geheInZelle(feld)
  }

  // Keine dieser Tasten darf bis zur Zeile durchfallen: dort loeste Enter die
  // Kette „Zeile gewaehlt" aus, und Pfeile blaetterten den Rumpf.
  tasteZelle(rohIndex: number, spaltenIndex: number, e: KeyboardEvent): void {
    const feld = e.target as HTMLInputElement
    // F5 heisst in der Maske Nachschlagen; eine gebuchte Zelle hat keines, und
    // der Browser luede sonst die ganze Maske neu.
    if (e.key === 'F5') {
      e.preventDefault()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (this.aenderungen.nimmZurueck(this.satzVon(rohIndex), spaltenIndex)) {
        this.wirt.melde()
      }
      return
    }
    const schritte: Record<string, number> = {
      Enter: 1,
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 10,
      PageUp: -10,
    }
    const schritt = schritte[e.key]
    if (schritt === undefined) return
    e.preventDefault()
    e.stopPropagation()
    this.zelleNachbar(spaltenIndex, feld, schritt, e.key === 'Enter')
  }
}

const TRENNER = '\u0000'

function schluessel(satz: string, spalte: number): string {
  return satz + TRENNER + String(spalte)
}

export class AenderungsSpeicher {
  private werte = new Map<string, string>()

  setze(satz: string, spalte: number, wert: string): boolean {
    if (satz === '') return false
    const k = schluessel(satz, spalte)
    if (this.werte.get(k) === wert) return false
    this.werte.set(k, wert)
    return true
  }

  nimmZurueck(satz: string, spalte: number): boolean {
    return this.werte.delete(schluessel(satz, spalte))
  }

  wert(satz: string, spalte: number): string | undefined {
    return satz === '' ? undefined : this.werte.get(schluessel(satz, spalte))
  }

  get anzahl(): number {
    return this.werte.size
  }

  leere(): void {
    this.werte.clear()
  }

  // Jede vorgemerkte Satznummer einmal, in der Reihenfolge der ersten Aenderung.
  saetze(): string[] {
    const raus: string[] = []
    for (const k of this.werte.keys()) {
      const satz = k.slice(0, k.indexOf(TRENNER))
      if (!raus.includes(satz)) raus.push(satz)
    }
    return raus
  }

  // Traegt diese Zeile ueberhaupt eine Vormerkung? Billiger als ueber alle
  // Spalten zu fragen.
  hatSatz(satz: string): boolean {
    if (satz === '') return false
    const anfang = satz + TRENNER
    for (const k of this.werte.keys()) if (k.startsWith(anfang)) return true
    return false
  }

  nimmSatzZurueck(satz: string): boolean {
    let weg = false
    for (const k of [...this.werte.keys()]) {
      if (k.slice(0, k.indexOf(TRENNER)) === satz && this.werte.delete(k)) weg = true
    }
    return weg
  }
}
