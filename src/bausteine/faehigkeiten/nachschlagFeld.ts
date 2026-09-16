// Faehigkeit Nachschlagen an EINER Eingabestelle: tippen, vorschlagen, im
// Fenster waehlen, den gewaehlten Satz weitergeben.
import { html, type TemplateResult } from 'lit'
import { jaNeinEigenschaft, type Bedingung, type Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { geberIdVon, klareAuswahl, setzeAuswahl } from './auswahl'
import {
  automatikSpalten,
  einzigenTrefferFinden,
  FENSTER_BREITE,
  FENSTER_HOEHE,
  folgeBeimVerlassen,
  holeEintraege,
  lupeZeichen,
  NACHSCHLAG_SPALTEN_BINDUNG,
  oeffneNachschlagen,
  satzPasstZurAuswahl,
  schliesseNachschlagenFuer,
  vorschlaegeImFensterStand,
  type Eintrag,
} from './nachschlagen'
import type { Spalte } from './spalten'
import { tasteVon, VorschlagStand } from './vorschlagStand'
import { eingabeStelleTpl } from './zellenEingabe'

export const NACHSCHLAG_VORGABEN = {
  nachschlagQuelle: '',
  speicherFeld: '',
  speicherTitel: '',
  nachschlagSpalten: [] as Spalte[],
  fensterBreite: FENSTER_BREITE,
  fensterHoehe: FENSTER_HOEHE,
  einzigerTreffer: 'nein',
}

export function nachschlagEigenschaften(wenn?: Bedingung): Eigenschaft[] {
  return [
    {
      schluessel: 'nachschlagQuelle',
      name: 'Quelle',
      beschreibung: 'Quelle, aus der der Bediener eine Zeile wählt.',
      art: 'quelle',
      wenn,
    },
    {
      schluessel: 'speicherFeld',
      name: 'Gespeichert wird',
      beschreibung: 'Feld, dessen Wert die Maske sich merkt (z. B. die Nummer).',
      art: 'field',
      quelleProp: 'nachschlagQuelle',
      klarnameProp: 'speicherTitel',
      wenn,
    },
    jaNeinEigenschaft(
      'einzigerTreffer',
      'Einzigen Treffer übernehmen',
      'Bleibt genau ein Satz übrig, übernimmt das Feld ihn von selbst.',
      { wenn },
    ),
  ]
}

// Das Feld GIBT seine Zeile: die im Fenster gewaehlte. Die Angaben des Fensters
// wohnen am Baustein, eingestellt wird es im Inspector und an der Lupe.
export function nachschlagFaehigkeiten(wenn?: Bedingung): Faehigkeit[] {
  return [
    { art: 'satzwahl', quelleProp: 'nachschlagQuelle', wenn },
    { art: 'liste', bindung: NACHSCHLAG_SPALTEN_BINDUNG },
    {
      art: 'suchfenster',
      fenster: {
        spaltenSchluessel: 'nachschlagSpalten',
        breiteSchluessel: 'fensterBreite',
        hoeheSchluessel: 'fensterHoehe',
        quelleProp: 'nachschlagQuelle',
        speicherFeldProp: 'speicherFeld',
        speicherTitelProp: 'speicherTitel',
        automatik: 'Ohne Spalten zeigt das Fenster eine: das gespeicherte Feld.'
          + ' Die erste Spalte ist, was nach der Wahl im Feld steht.',
        stelle: '.lupe',
        wenn,
      },
    },
  ]
}

export interface NachschlagFeldWirt {
  baustein: HTMLElement
  melde: () => void
  imEditor: () => boolean

  quelle: () => string
  speicherFeld: () => string
  speicherTitel: () => string
  spalten: () => readonly Spalte[]
  titel: () => string
  breite: () => number
  hoehe: () => number
  einzigerTreffer: () => boolean

  // Den gemerkten Wert haelt der Baustein: er steht in seiner Eigenschaft und
  // reist ueber sie in Export und Kette.
  wert: () => string
  setzeWert: (wert: string) => void
  geaendert: () => void
}

export class NachschlagFeld {
  private anzeige = ''

  private getippt: string | null = null

  private satz: unknown = undefined

  // Vor dem Zeichnen gefuellt, damit Anzeige und Tastatur denselben Stand sehen.
  private readonly liste = new VorschlagStand<Eintrag>()

  private readonly wirt: NachschlagFeldWirt

  constructor(wirt: NachschlagFeldWirt) {
    this.wirt = wirt
  }

  get imFeld(): string {
    return this.getippt ?? this.anzeige
  }

  get listeOffen(): boolean {
    return this.liste.offen
  }

  ziehNach(): void {
    this.liste.zeige(this.berechneVorschlaege())
  }

  zeichne(klasse: string, titel: string): TemplateResult {
    return eingabeStelleTpl({
      wert: this.imFeld,
      titel,
      // Der Platzhalter des Feldes ist eine eigene Schicht ueber dem Kasten.
      platzhalter: '',
      klasse,
      halterKlasse: 'nachschlag',
      vorschlaege: this.liste.treffer,
      marke: this.liste.marke,
      neben: html`<button
        class="lupe"
        type="button"
        aria-label="Nachschlagen"
        title="Nachschlagen"
        @click=${() => this.oeffneFenster()}
      >${lupeZeichen()}</button>`,
    }, {
      tippen: (wert) => {
        this.getippt = wert
        this.liste.vonVorn()
      },
      taste: (e) => this.taste(e),
      verlassen: () => this.verlassen(),
      waehleVorschlag: (i) => this.uebernimmVorschlag(i),
      setzeMarke: (i) => {
        this.liste.setzeMarke(i)
        this.wirt.melde()
      },
    })
  }

  // Im Editor faengt der Wirt den Klick auf die Lupe ab und macht dasselbe
  // Fenster mit den Editor-Anfassern auf.
  private oeffneFenster(suchtext = ''): void {
    if (this.wirt.imEditor()) return
    oeffneNachschlagen({
      el: this.wirt.baustein,
      quelleId: this.wirt.quelle(),
      speicherFeld: this.wirt.speicherFeld(),
      speicherTitel: this.wirt.speicherTitel(),
      spalten: this.wirt.spalten(),
      titel: this.wirt.titel(),
      breite: this.wirt.breite(),
      hoehe: this.wirt.hoehe(),
      suchtext,
      // Zurueck ins Feld, nicht auf die Lupe: wer Esc drueckt, will weitertippen.
      rueckFokus: () => this.wirt.baustein.shadowRoot
        ?.querySelector<HTMLInputElement>('.nachschlag .ctrl')?.focus(),
      onUebernehmen: (anzeige, wert, satz) => this.uebernimmUndMelde(anzeige, wert, satz),
    })
  }

  // Die Vorschlaege kommen aus DERSELBEN Quelle wie das grosse Fenster, nur
  // gefiltert und gekuerzt. Ohne Quelle bleibt die Liste still leer: eine Meldung
  // bei jedem Tastendruck waere unbrauchbar.
  private berechneVorschlaege(): Eintrag[] {
    if (this.liste.zugemacht || this.wirt.imEditor()) return []
    if (this.getippt === null && !this.liste.aufgemacht) return []
    const ergebnis = this.eintraege()
    if (!ergebnis.ok) return []
    const getippt = this.getippt ?? ''
    // Aufgemacht heisst alles zeigen, sonst bleibt die Liste dem Getippten
    // vorbehalten.
    if (getippt === '' && !this.liste.aufgemacht) return []
    const eigene = this.wirt.spalten()
    return vorschlaegeImFensterStand(
      ergebnis.eintraege,
      getippt,
      eigene.length > 0 ? eigene : this.automatik(),
      this.wirt.baustein,
    )
  }

  private eintraege(): ReturnType<typeof holeEintraege> {
    return holeEintraege({
      el: this.wirt.baustein,
      quelleId: this.wirt.quelle(),
      speicherFeld: this.wirt.speicherFeld(),
      spalten: this.wirt.spalten(),
    })
  }

  private automatik(): Spalte[] {
    return automatikSpalten({
      speicherFeld: this.wirt.speicherFeld(),
      speicherTitel: this.wirt.speicherTitel(),
    })
  }

  // Escape kommt hier NICHT an, wenn ein Fenster offen ist: dessen Rahmen hoert
  // am window in der Abfang-Phase und schliesst sich selbst.
  private taste(e: KeyboardEvent): void {
    // Im Editor bleibt jede Taste dem Editor: F5 laedt dort die Seite neu.
    if (this.wirt.imEditor()) return
    if (e.key === 'F5') e.preventDefault()
    const folge = this.liste.folgeFuer(tasteVon(e), {
      listeOffen: this.liste.offen,
      feldLeer: this.imFeld === '',
      getippt: this.getippt !== null,
      nachschlagbar: true,
      // Das Fenster meldet selbst, wenn Quelle oder „Gespeichert wird" fehlen;
      // darum darf hier jede Taste hineinlaufen.
      hatSaetze: () => true,
      // Ein Feld hat keine naechste Zelle: weiter fuehrt der Browser mit Tab.
      springt: false,
    })
    if (folge === 'nichts') {
      if (e.key === 'Enter') e.preventDefault()
      return
    }
    // Nach der Uebernahme mit Tab geht der Fokus weiter, wie der Browser ihn
    // fuehrt; jede andere Taste bleibt im Feld.
    if (e.key !== 'Tab') e.preventDefault()
    if (folge === 'uebernehmen') this.uebernimmVorschlag(this.liste.marke)
    else if (folge === 'fenster') this.oeffneFenster(this.getippt ?? '')
    else if (folge === 'liste-auf') this.liste.aufmachen()
    else if (folge === 'leeren') {
      this.getippt = null
      this.leere()
      this.wirt.geaendert()
    }
    this.wirt.melde()
  }

  private verlassen(): void {
    if (this.wirt.imEditor()) return
    const folge = folgeBeimVerlassen(this.imFeld, this.anzeige, this.wirt.wert())
    this.getippt = null
    this.liste.ruhe()
    if (folge !== 'leeren') return
    this.leere()
    this.wirt.geaendert()
  }

  private uebernimmVorschlag(index: number): void {
    const treffer = this.liste.treffer[index]
    if (!treffer) return
    this.uebernimmUndMelde(treffer.anzeige, treffer.wert, treffer.satz)
  }

  // Der eine Uebernahme-Weg fuer den Bediener: Zeilenklick im Fenster und Wahl
  // in der Vorschlagsliste landen beide hier.
  private uebernimmUndMelde(anzeige: string, wert: string, satz: unknown): void {
    this.getippt = null
    this.liste.ruhe()
    this.nimm(anzeige, wert, satz)
    this.wirt.geaendert()
  }

  private nimm(anzeige: string, wert: string, satz: unknown): void {
    this.anzeige = anzeige !== '' ? anzeige : wert
    this.wirt.setzeWert(wert)
    this.satz = satz
    // Hier hat ein MENSCH den Satz gewaehlt; sonst bremste die Kreis-Bremse der
    // holenden Quellen die Rueckkehr zu einem schon gewaehlten Beleg aus.
    setzeAuswahl(geberIdVon(this.wirt.baustein), satz, true)
  }

  private leere(): void {
    this.satz = undefined
    this.anzeige = ''
    this.wirt.setzeWert('')
    this.liste.ruhe()
    klareAuswahl(geberIdVon(this.wirt.baustein))
  }

  // Nach jeder Lieferung: was der Bediener gewaehlt hat, muss zur Auswahl der
  // Maske passen, sonst steht ein Satz im Feld, den es dort nicht mehr gibt.
  pruefeWert(): void {
    // Trifft der Daten-Push erst nach dem ersten Tastendruck ein, muss die
    // offene Liste nachziehen.
    if (this.getippt !== null) this.wirt.melde()
    if (this.satz !== undefined && !satzPasstZurAuswahl(this.wirt.baustein, this.satz)) {
      this.leere()
    }
    if (!this.wirt.einzigerTreffer()) return
    const ergebnis = this.eintraege()
    if (!ergebnis.ok) return
    const treffer = einzigenTrefferFinden(ergebnis.eintraege, this.satz === undefined)
    if (treffer) this.nimm(treffer.anzeige, treffer.wert, treffer.satz)
  }

  // Stirbt das Feld, darf sein Fenster nicht als Waise am document.body
  // weiterleben.
  aufraeumen(): void {
    schliesseNachschlagenFuer(this.wirt.baustein)
  }
}
