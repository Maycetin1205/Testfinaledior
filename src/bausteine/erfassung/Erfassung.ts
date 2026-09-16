// Baustein Erfassung: eine Liste, die neue Zeilen annimmt, gebuchte aendert und loescht.
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit, GeschriebeneZeile, Lieferung, VormerkArt } from '../../kern/maske/faehigkeiten'
import { BERECHNUNGEN_PROP, berechnungenAus, type Berechnung } from '../../kern/daten/berechnung'
import { meldeFehler } from '../../softengine/meldung'
import { LEER_TEXT_STANDARD, leerStil } from '../faehigkeiten/leerZustand'
import {
  LISTEN_RASTER,
  ListenStand,
  listenEigenschaften,
  listenFaehigkeiten,
  listenVorgaben,
} from '../faehigkeiten/listenStand'
import { standardSpalten } from '../faehigkeiten/spalten'
import { tabelleStil } from '../faehigkeiten/tabelleStil'
import { schliesseNachschlagenFuer } from '../faehigkeiten/nachschlagen'
import { vorschlagStil } from '../faehigkeiten/vorschlagListe'
import { meldeVormerkungen } from '../faehigkeiten/vormerkStand'
import { geheInZelle, zellenEingabeStil, zellenFelder } from '../faehigkeiten/zellenEingabe'
import { hatSatzNummer } from '../faehigkeiten/zeilenAnschluss'
import type { Unterzeilen, Zeilenschmuck } from '../faehigkeiten/tabelleKoerper'
import { ErfassungsStand } from '../faehigkeiten/erfassungsStand'
import { erfassungsZeileFuer, type ErfassungsWirt } from '../faehigkeiten/erfassungsBedienung'
import { erfassteZeilenTpl, erfassungsSchmuck } from '../faehigkeiten/erfassungsKoerper'
import {
  ERFASSUNG_SPALTEN_BINDUNG,
  coerceErfassungsSpalten,
  tryCoerceErfassungsSpalten,
  type ErfassungsSpalte,
} from '../faehigkeiten/erfassungsSpalte'
import type { ErfassungsUmfeld } from '../faehigkeiten/erfassungsZeile'
import { ZeilenBearbeitung, loeschbarEigenschaft } from '../faehigkeiten/zeilenBearbeitung'
import { LaufStand, type ZeilenZeichen } from '../faehigkeiten/zeilenStatus'
import { erfassungStil } from './erfassungStil'

const NICHT_ANGEKOMMEN = 'Nicht im Beleg angekommen.'

// Die geaenderte Zeile steht im Beleg, sie traegt nur die Aenderung nicht; die
// geloeschte steht ueberhaupt noch da. Zwei andere Saetze als beim Erfassen.
const NICHT_GEAENDERT = 'Im Beleg unverändert geblieben.'

const NICHT_GELOESCHT = 'Steht noch im Beleg.'

export class Erfassung extends Grundbaustein {
  static readonly typ = 'erfassung'
  static readonly tag = 'ff-erfassung'
  static readonly anzeigeName = 'Erfassung'
  static readonly kategorie: Kategorie = 'eingabe'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    ...listenFaehigkeiten(ERFASSUNG_SPALTEN_BINDUNG),
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

  static readonly vorgaben = {
    ...listenVorgaben(),
    loeschbar: 'nein',
    [BERECHNUNGEN_PROP]: [],
  }

  // Hinter der Suchzeile, wo der Schalter in der Liste stand.
  static override readonly eigenschaften: Eigenschaft[] = listenEigenschaften()
    .flatMap((p) => (p.schluessel === 'suche' ? [p, loeschbarEigenschaft()] : [p]))

  static readonly raster = LISTEN_RASTER

  static override styles: CSSResultGroup = [
    Grundbaustein.styles,
    leerStil,
    tabelleStil,
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
  spalten: ErfassungsSpalte[] = standardSpalten()

  @property() quelle = ''

  @property() suche = 'ja'

  @property() blaettern = 'ja'

  @property() kopfzeile = 'ja'

  @property() spaltenwahl = 'nein'

  @property() leerText = LEER_TEXT_STANDARD

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

  @property({ attribute: false }) datenzeilen: string[][] = []

  @property({ attribute: false }) rohzeilen: unknown[] = []

  @property({ attribute: false }) durchAuswahlGefiltert = false

  @property({ attribute: false }) datenGeliefert = false

  private readonly _erfassung = new ErfassungsStand()

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

  private readonly _liste = new ListenStand({
    baustein: this,
    melde: () => this.requestUpdate(),
    spalten: () => this.spaltenListe(),
    berechnungen: () => this.berechnungsListe(),
    // Ein Undo-Schritt je Aenderung der Spaltenliste.
    schreibeSpalten: (spalten) => {
      this.dispatchEvent(new CustomEvent('ff-prop-change', {
        detail: { attr: 'spalten', value: spalten },
        bubbles: true,
        composed: true,
      }))
    },
    quelle: () => this.quelle,
    suche: () => this.suche === 'ja',
    blaettern: () => this.blaettern === 'ja',
    kopfzeile: () => this.kopfzeile === 'ja',
    spaltenwahl: () => this.spaltenwahl === 'ja',
    leerText: () => this.leerText,
    zellWert: (rohIndex, platz) => this._zeilen.zellWert(rohIndex, platz),
    schmuck: () => this.zeilenSchmuck(),
    unten: () => this.unterZeilen(),
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

  private spaltenListe(): ErfassungsSpalte[] {
    return coerceErfassungsSpalten(this.spalten)
  }

  private berechnungsListe(): readonly Berechnung[] {
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
      // Bei eingeschalteter Kopfzeile stehen die Titel schon oben; ein zweites
      // Mal in der Zelle waere dasselbe Wort doppelt.
      titelInZelle: () => this.kopfzeile !== 'ja',
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
    return !this.imEditor && this.quelle.trim() !== '' && hatSatzNummer(this)
  }

  private zeilenSchmuck(): (rohIndex: number | null) => Zeilenschmuck {
    return erfassungsSchmuck({
      imEditor: this.imEditor,
      loeschbar: this.loeschbar === 'ja',
      tippbar: this.aendernMoeglich,
      zeilen: this._zeilen,
    })
  }

  private unterZeilen(): Unterzeilen {
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
    const alle = Array.from(this.ownerDocument.querySelectorAll<Erfassung>(Erfassung.tag))
    const pfad = e.composedPath()
    const zustaendig = alle.find((t) => pfad.includes(t)) ?? alle[0]
    if (zustaendig !== this) return
    e.preventDefault()
    this.fokussiereErfassungsZelle(0)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this._liste.angemeldet()
    document.addEventListener('keydown', this.maskenTaste)
  }

  protected override firstUpdated(): void {
    this._liste.beobachte()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._liste.abgemeldet()
    document.removeEventListener('keydown', this.maskenTaste)
    schliesseNachschlagenFuer(this)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('spalten')) this._liste.spaltenGewechselt()
    if (this.imEditor) return
    this._erfassung.lauf.aktualisiereVorschlaege(this.erfassungsUmfeld())
  }

  protected override updated(): void {
    this._liste.nachRendern()
    meldeVormerkungen(this)
  }

  override render(): TemplateResult {
    return this._liste.zeichne()
  }
}

Grundbaustein.defineAndRegister(Erfassung)
