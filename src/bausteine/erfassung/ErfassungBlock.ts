// Baustein Erfassung: eine Tabelle, die neue Zeilen annimmt, gebuchte aendert und loescht.
import { nothing, type CSSResultGroup, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Faehigkeit, GeschriebeneZeile, Lieferung, VormerkArt } from '../../kern/maske/faehigkeiten'
import { meldeFehler } from '../../softengine/meldung'
import { Grundbaustein } from '../grund/Grundbaustein'
import { vorschlagStil } from '../faehigkeiten/vorschlagListe'
import { meldeVormerkungen } from '../faehigkeiten/vormerkStand'
import { geheInZelle, zellenEingabeStil, zellenFelder } from '../faehigkeiten/zellenEingabe'
import { OHNE_SCHMUCK, type Unterzeilen, type Zeilenschmuck } from '../faehigkeiten/tabelleKoerper'
import { schliesseNachschlagenFuer } from '../faehigkeiten/nachschlagen'
import { hatSatzNummer } from '../faehigkeiten/zeilenAnschluss'
import { standardSpalten } from '../faehigkeiten/spalten'
import { BERECHNUNGEN_PROP, berechnungenAus, type Berechnung } from '../../kern/daten/berechnung'
import { Tabelle } from '../tabelle/Tabelle'
import { ErfassungsAnschluss } from './erfassungsAnschluss'
import { erfassungsZeileFuer, type ErfassungsWirt } from './erfassungsBedienung'
import {
  ERFASSUNG_EIGENSCHAFTEN,
  ERFASSUNG_SPALTEN_BINDUNG,
  spalteAenderbar,
} from './erfassungsEigenschaften'
import {
  erfassteZeilenTpl,
  kreuzAnzeigeTpl,
  loeschKreuzTpl,
  tippZelleTpl,
} from './erfassungsKoerper'
import {
  coerceErfassungsSpalten,
  tryCoerceErfassungsSpalten,
  type ErfassungsSpalte,
} from './erfassungsSpalte'
import { erfassungStil } from './erfassungStil'
import type { ErfassungsUmfeld } from './erfassungsZeile'
import { ZeilenBearbeitung } from './zeilenBearbeitung'
import { LaufStand, type ZeilenZeichen } from './zeilenStatus'

const NICHT_ANGEKOMMEN = 'Nicht im Beleg angekommen.'

// Die geaenderte Zeile steht im Beleg, sie traegt nur die Aenderung nicht; die
// geloeschte steht ueberhaupt noch da. Zwei andere Saetze als beim Erfassen.
const NICHT_GEAENDERT = 'Im Beleg unverändert geblieben.'

const NICHT_GELOESCHT = 'Steht noch im Beleg.'

export class ErfassungBlock extends Tabelle {
  static override readonly typ = 'erfassung'
  static override readonly tag = 'ff-erfassung'
  static override readonly anzeigeName = 'Erfassung'
  static override readonly kategorie: Kategorie = 'eingabe'

  static override readonly faehigkeiten: readonly Faehigkeit[] = [
    ...Tabelle.faehigkeiten.filter((f) => f.art !== 'liste'),
    { art: 'liste', bindung: ERFASSUNG_SPALTEN_BINDUNG },
    { art: 'erfassen' },
    { art: 'aendern', schluessel: 'aenderbar' },
    { art: 'loeschen', wenn: { schluessel: 'loeschbar', gleich: 'ja' } },
    { art: 'haeltGesendete' },
    { art: 'rechnen', prop: BERECHNUNGEN_PROP },
    // Jede Spalte mit Hilfsquelle hat ihr eigenes Suchfenster (F5); eingestellt
    // wird es IM Fenster, das der Spaltenkopf aufmacht.
    {
      art: 'suchfenster',
      fenster: {
        eintraegeProp: 'spalten',
        titelSchluessel: 'titel',
        quelleSchluessel: 'fuellFeld',
        spaltenSchluessel: 'fensterSpalten',
        breiteSchluessel: 'fensterBreite',
        hoeheSchluessel: 'fensterHoehe',
        automatik: 'Ohne Spalten nimmt das Fenster die Spalten derselben Hilfsquelle.',
      },
    },
  ]

  static override readonly vorgaben = {
    ...Tabelle.vorgaben,
    spalten: standardSpalten(),
    loeschbar: 'nein',
    [BERECHNUNGEN_PROP]: [],
  }

  static override readonly eigenschaften = ERFASSUNG_EIGENSCHAFTEN

  static override styles: CSSResultGroup = [
    Tabelle.styles,
    vorschlagStil,
    zellenEingabeStil,
    erfassungStil,
  ]

  @property({
    converter: {
      fromAttribute: (v: string | null): ErfassungsSpalte[] =>
        v ? tryCoerceErfassungsSpalten(v) : standardSpalten(),
      toAttribute: (v: ErfassungsSpalte[]): string => JSON.stringify(v),
    },
  })
  override spalten: ErfassungsSpalte[] = standardSpalten()

  @property() loeschbar = 'nein'

  @property({
    converter: {
      fromAttribute: (v: string | null): Berechnung[] => {
        if (!v) return []
        try {
          return berechnungenAus(JSON.parse(v))
        } catch {
          return []
        }
      },
      toAttribute: (v: Berechnung[]): string => JSON.stringify(v),
    },
  })
  berechnungen: Berechnung[] = []

  private readonly _erfassung = new ErfassungsAnschluss()

  private readonly _lauf = new LaufStand(() => this.requestUpdate())

  private readonly _zeilen = new ZeilenBearbeitung({
    baustein: this,
    spalten: () => this.spaltenListe(),
    berechnungen: () => this.berechnungsListe(),
    rohzeilen: () => this.rohzeilen,
    datenzeilen: () => this.datenzeilen,
    melde: () => this.requestUpdate(),
    lauf: this._lauf,
    fokussiereErfassungsZelle: (index) => this.fokussiereErfassungsZelle(index),
  })

  // Der Laufzeit-Vertrag der Kette am Knopf: sie liest diese Listen ueber die
  // Element-Referenz.
  get erfassteZeilen(): readonly (readonly string[])[] {
    return this._erfassung.vormerkungen(this.erfassungsUmfeld()).map((v) => v.werte)
  }

  get erfassteSchluessel(): readonly string[] {
    return this._erfassung.vormerkungen(this.erfassungsUmfeld()).map((v) => v.kennung)
  }

  get geaenderteZeilen(): readonly { satz: string; werte: readonly string[] }[] {
    return this._zeilen.geaenderteZeilen
  }

  get geloeschteZeilen(): readonly { satz: string; werte: readonly string[] }[] {
    return this._zeilen.geloeschteZeilen
  }

  zeileSchreibt(art: VormerkArt, schluessel: string): void {
    this._lauf.schreibt(art, schluessel)
  }

  zeileGescheitert(art: VormerkArt, schluessel: string, meldung: string): void {
    this._lauf.gescheitert(art, schluessel, meldung)
  }

  laufFertig(art: VormerkArt, geschrieben: readonly GeschriebeneZeile[]): void {
    const schluessel = geschrieben.map((z) => z.schluessel)
    this._lauf.fertig(art, schluessel)
    if (art === 'erfasst') {
      if (this._erfassung.markiereGeschrieben(this.erfassungsUmfeld(), geschrieben)) {
        this.requestUpdate()
      }
      return
    }
    this._zeilen.austragen(art, schluessel)
  }

  // Der Vertrag der Faehigkeit haeltGesendete: die Lieferung entscheidet, welche
  // hinausgeschickte Zeile im Beleg steht. Die fehlenden bleiben vorgemerkt und
  // tragen die Fehlermarke, bis der naechste Lauf sie noch einmal versucht.
  // Erfasste, geaenderte und geloeschte Zeilen nach derselben Regel.
  pruefeAnkunft(lieferung: Lieferung | null): void {
    const bericht = this._erfassung.pruefeAnkunft(lieferung, this.spaltenListe())
    for (const kennung of bericht.fehlende) {
      this._lauf.gescheitert('erfasst', kennung, NICHT_ANGEKOMMEN)
    }
    const gebuchte = this._zeilen.pruefeAnkunft(lieferung)
    for (const satz of gebuchte.aenderungFehlt) {
      this._lauf.gescheitert('geaendert', satz, NICHT_GEAENDERT)
    }
    for (const satz of gebuchte.loeschungFehlt) {
      this._lauf.gescheitert('geloescht', satz, NICHT_GELOESCHT)
    }
    // Der Balken traegt eine Zeile: was diese Lieferung entschieden hat, geht
    // in einem Stueck hinaus, sonst ueberschriebe die zweite Meldung die erste.
    const meldung = [bericht.meldung, gebuchte.meldung].filter((text) => text !== '').join(' ')
    if (meldung !== '') meldeFehler(meldung)
    if (bericht.geaendert || gebuchte.bewegt) this.requestUpdate()
  }

  protected override setzeAbgeleitetesZurueck(): void {
    super.setzeAbgeleitetesZurueck()
    this._erfassung.zuruecksetzen()
  }

  protected override zellWert(rohIndex: number, platz: number): string {
    return this._zeilen.zellWert(rohIndex, platz)
  }

  protected override spaltenListe(): ErfassungsSpalte[] {
    return coerceErfassungsSpalten(this.spalten)
  }

  protected override berechnungsListe(): readonly Berechnung[] {
    return berechnungenAus(this.berechnungen)
  }

  private erfassungsUmfeld(): ErfassungsUmfeld {
    return this._erfassung.umfeld(
      this,
      this.spaltenListe(),
      this.quelle,
      this.berechnungsListe(),
    )
  }

  private erfassungsWirt(): ErfassungsWirt {
    return {
      baustein: this,
      lauf: this._erfassung.lauf,
      umfeld: () => this.erfassungsUmfeld(),
      melde: () => this.requestUpdate(),
      fokussiere: (index) => this.fokussiereErfassungsZelle(index),
      erfasseZeile: () => this.erfasseZeile(),
    }
  }

  private fokussiereErfassungsZelle(index: number): void {
    void this.updateComplete.then(() => {
      geheInZelle(zellenFelder(this.shadowRoot, '.zeile.erfassung', index)[0])
    })
  }

  private erfasseZeile(): boolean {
    if (!this._erfassung.erfasse(this.erfassungsUmfeld())) return false
    this.requestUpdate()
    this.fokussiereErfassungsZelle(0)
    this.zeigeLetzteErfasste()
    return true
  }

  // Ans Ende rollen statt zur Zeile: die klebende Erfassungszeile gilt dem
  // Browser als sichtbar, er rollt darum von selbst nicht.
  private zeigeLetzteErfasste(): void {
    void this.updateComplete.then(() => {
      const koerper = this.shadowRoot?.querySelector<HTMLElement>('.koerper')
      if (koerper) koerper.scrollTop = koerper.scrollHeight
    })
  }

  private erfasstStand(index: number): ZeilenZeichen {
    return this._lauf.zeigt(
      'erfasst',
      this._erfassung.schluessel[index] ?? '',
      this._erfassung.istGeschrieben(index) ? 'geschrieben' : 'erfasst',
    )
  }

  // Getippt wird nur in der Maske und nur an Zeilen mit Satznummer: ohne sie
  // haette eine Aenderung kein Schreibziel.
  private get aendernMoeglich(): boolean {
    return !this.imEditor && this.hatQuelle && hatSatzNummer(this)
  }

  protected override zeilenSchmuck(): (rohIndex: number | null) => Zeilenschmuck {
    const loeschbar = this.loeschbar === 'ja'
    const tippbar = this.aendernMoeglich
    const kreuz = loeschbar && tippbar
    return (rohIndex) => {
      if (rohIndex === null) {
        return {
          ...OHNE_SCHMUCK,
          rechts: loeschbar && this.imEditor ? kreuzAnzeigeTpl() : nothing,
        }
      }
      const zeichen = this._zeilen.statusVon(rohIndex)
      const geloescht = this._zeilen.istGeloescht(rohIndex)
      return {
        status: zeichen.status === 'gebucht' ? '' : zeichen.status,
        titel: zeichen.titel,
        klasse: geloescht ? 'geloescht' : '',
        fehltext: zeichen.status === 'fehler' ? zeichen.titel : '',
        zelle: (platz, spalte) => (tippbar && spalteAenderbar(spalte)
          ? tippZelleTpl(this._zeilen, rohIndex, platz, spalte)
          : null),
        rechts: kreuz
          ? loeschKreuzTpl(geloescht, () => this._zeilen.schalteLoeschung(rohIndex))
          : nothing,
        taste: (e) => {
          if (e.key !== 'Delete' || !kreuz) return false
          this._zeilen.schalteLoeschung(rohIndex)
          return true
        },
      }
    }
  }

  protected override unterZeilen(): Unterzeilen {
    const erfasste = this._erfassung.zeilen
    return {
      anzahl: 1 + erfasste.length,
      zeichne: ({ sicht, cols, linealTakte }) => {
        const korrekturPlatz = this._erfassung.korrekturPlatz
        return erfassteZeilenTpl({
          spalten: sicht.spalten,
          plaetze: sicht.plaetze,
          cols,
          imEditor: this.imEditor,
          erfasste,
          erfasstStand: (index) => this.erfasstStand(index),
          korrekturPlatz,
          erfassung: erfassungsZeileFuer(
            this.erfassungsWirt(),
            cols,
            // Kein Lineal mehr uebrig: die Zeile sitzt ganz unten, unter ihr
            // ist kein Platz fuer die Vorschlagsliste.
            korrekturPlatz === null && (linealTakte ?? 1) <= 0,
            sicht,
          ),
        }, {
          nimmErfassteZeile: (index) => {
            if (this._erfassung.entferne(index)) this.requestUpdate()
          },
          holeErfassteZeile: (index) => {
            if (!this._erfassung.zurueckholen(this.erfassungsUmfeld(), index)) return
            this.requestUpdate()
            this.fokussiereErfassungsZelle(0)
          },
        })
      },
    }
  }

  // Insert springt in die Erfassungszeile der Erfassung, in der der Fokus
  // steht, sonst in die erste der Maske.
  private readonly maskenTaste = (e: KeyboardEvent): void => {
    if (this.imEditor || e.key !== 'Insert') return
    const alle = Array.from(
      this.ownerDocument.querySelectorAll<ErfassungBlock>(ErfassungBlock.tag),
    )
    const pfad = e.composedPath()
    const zustaendig = alle.find((t) => pfad.includes(t)) ?? alle[0]
    if (zustaendig !== this) return
    e.preventDefault()
    this.fokussiereErfassungsZelle(0)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.maskenTaste)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.maskenTaste)
    schliesseNachschlagenFuer(this)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.imEditor) return
    this._erfassung.lauf.aktualisiereVorschlaege(this.erfassungsUmfeld())
  }

  protected override updated(): void {
    super.updated()
    meldeVormerkungen(this)
  }
}

Grundbaustein.defineAndRegister(ErfassungBlock)
