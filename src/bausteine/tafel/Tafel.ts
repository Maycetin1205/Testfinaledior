// Baustein Kanban (neu): eine Tafel, die Spalten, Plätze und Karten selbst zeichnet.
import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { satzIndexVon } from '../../softengine/data'
import { auswahlWiederfinden, geberIdVon, merkmalVon, waehleAuswahl } from '../faehigkeiten/auswahl'
import { meldeKettenFehler, runEvent } from '../faehigkeiten/ereignisse'
import { farbweltStil, farbweltWert, type FarbweltWert } from '../faehigkeiten/farbwelt'
import { LEER_TEXT_STANDARD, leerStil, leerTextEigenschaft, leerZustand } from '../faehigkeiten/leerZustand'
import { holeDatenVorspann, macheDatenAnschluss, tagFeldEigenschaft } from '../faehigkeiten/quelle'
import {
  ablageFuer,
  ablageName,
  ablageSchluessel,
  ablageWerte,
  alleAblagen,
  istSichtbar,
  naechsteAblage,
  sichtbarePlaetze,
  standardTafelSpalten,
  tafelSpaltenEigenschaft,
  tafelSpaltenLesen,
  traegtWert,
  type Ablage,
  type TafelSpalte,
} from '../faehigkeiten/tafelSpalten'
import {
  STELLEN,
  karteInhalt,
  kartenEigenschaften,
  markeVon,
  markenLesen,
  vergleicheKarten,
  type KartenWerte,
  type Markierung,
  type Stelle,
} from '../faehigkeiten/tafelKarte'
import { tafelStil } from './tafelStil'

const STRICH = '—'
const PLATZ_LEER = 'frei · hierher ziehen'

interface Karte {
  schluessel: string
  zeile: unknown
  satz: string
  werte: KartenWerte
  ablage: Ablage
}

interface Erwartet {
  schluessel: string
  ziel: string
  angekommen: boolean
}

const anschluss = macheDatenAnschluss<Tafel>({ hydriere: (el, lieferung) => el.hydriere(lieferung) })

export class Tafel extends Grundbaustein {
  static readonly typ = 'tafel'
  static readonly tag = 'ff-tafel'
  static readonly anzeigeName = 'Kanban (neu)'
  static readonly kategorie: Kategorie = 'anzeige'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'satzwahl' },
    {
      art: 'ereignisse',
      liste: [
        { schluessel: 'onCardClick', name: 'Karte angeklickt' },
        { schluessel: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ]

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false
  static readonly hoeheAenderbar = true
  static readonly raster = { startBreite: 48, startHoehe: 20, minBreite: 12, minHoehe: 8 }

  static readonly vorgaben = {
    quelle: '',
    spaltenFeld: '',
    tagFeld: '',
    leerText: LEER_TEXT_STANDARD,
    spalten: standardTafelSpalten(),
    chipFarbwelt: 'info',
    bildArt: 'bild',
    marken: [] as Markierung[],
    sortierFeld: '',
    titelFeld: '',
    titelZusatzFeld: '',
    unterzeileFeld: '',
    zeitFeld: '',
    markeFeld: '',
    textFeld: '',
    datumFeld: '',
    chipFeld: '',
    bildFeld: '',
  }

  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'spaltenFeld',
      name: 'Karten liegen nach',
      beschreibung: 'Das Feld, dessen Wert sagt, auf welchem Platz eine Karte liegt.',
      zusatz: 'Jeder Platz nennt unter „Spalten und Plätze“ seinen Wert in diesem Feld. Verschieben schreibt diesen Wert über die Aktion „Karte verschoben“.',
      art: 'field',
    },
    tagFeldEigenschaft(),
    tafelSpaltenEigenschaft(),
    ...kartenEigenschaften(),
    { ...leerTextEigenschaft(), bearbeitung: 'inspector', abschnitt: 'inhalt', gruppe: 'Wenn die Quelle nichts liefert' },
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, leerStil, farbweltStil, tafelStil]

  @property({
    converter: {
      fromAttribute: (v: string | null): TafelSpalte[] => tafelSpaltenLesen(v ?? undefined),
      toAttribute: (v: TafelSpalte[]): string => JSON.stringify(v),
    },
  })
  spalten: TafelSpalte[] = standardTafelSpalten()

  @property({
    converter: {
      fromAttribute: (v: string | null): Markierung[] => markenLesen(v),
      toAttribute: (v: Markierung[]): string => JSON.stringify(v),
    },
  })
  marken: Markierung[] = []

  @property() quelle = ''
  @property() spaltenFeld = ''
  @property() tagFeld = ''
  @property() leerText = LEER_TEXT_STANDARD
  @property() chipFarbwelt: FarbweltWert = 'info'
  @property() bildArt = 'bild'
  @property() sortierFeld = ''
  @property() titelFeld = ''
  @property() titelZusatzFeld = ''
  @property() unterzeileFeld = ''
  @property() zeitFeld = ''
  @property() markeFeld = ''
  @property() textFeld = ''
  @property() datumFeld = ''
  @property() chipFeld = ''
  @property() bildFeld = ''

  @state() private _karten: Karte[] = []
  @state() private _geliefert = false
  @state() private _meldung = ''
  @state() private _schreibt = false
  @state() private _gewaehlt = ''
  @state() private _gezogen = ''
  @state() private _ziel = ''

  private _erwartet: Erwartet | null = null
  private _warteTimer?: ReturnType<typeof setTimeout>

  private spaltenListe(): TafelSpalte[] {
    return tafelSpaltenLesen(this.spalten)
  }

  private feldVon(stelle: Stelle): string {
    return this[`${stelle}Feld`]
  }

  override connectedCallback(): void {
    super.connectedCallback()
    anschluss.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    anschluss.disconnect(this)
    clearTimeout(this._warteTimer)
  }

  // Der Schluessel einer Karte haengt an der Satznummer, wo sie eindeutig ist,
  // sonst am Inhalt: nur so bleibt die Auswahl ueber eine Lieferung hinweg.
  hydriere(lieferung: boolean): void {
    const vorspann = holeDatenVorspann(this)
    if (!vorspann) return
    const spalten = this.spaltenListe()
    const satzAnzahl = new Map<string, number>()
    for (const zeile of vorspann.zeilen) {
      const satz = satzIndexVon(vorspann.quelle, zeile)
      if (satz !== '') satzAnzahl.set(satz, (satzAnzahl.get(satz) ?? 0) + 1)
    }
    const vorkommen = new Map<string, number>()
    const karten = vorspann.zeilen.map((zeile) => {
      const satz = satzIndexVon(vorspann.quelle, zeile)
      const eindeutig = satz !== '' && satzAnzahl.get(satz) === 1
      const basis = JSON.stringify([vorspann.quelle.id, eindeutig ? 'satz' : 'inhalt', eindeutig ? satz : merkmalVon(zeile)])
      const nummer = vorkommen.get(basis) ?? 0
      vorkommen.set(basis, nummer + 1)
      const lies = (feld: string): string => (feld === '' ? '' : vorspann.lies(zeile, feld))
      const werte = Object.fromEntries(STELLEN.map(({ stelle }) => [stelle, lies(this.feldVon(stelle))])) as KartenWerte
      const schluessel = `${basis}:${nummer}`
      const wert = lies(this.spaltenFeld)
      const ablage = ablageFuer(spalten, wert)
      const erwartet = this._erwartet
      if (lieferung && erwartet?.schluessel === schluessel) {
        erwartet.angekommen = ablageSchluessel(ablage) === erwartet.ziel && traegtWert(spalten, ablage, wert)
      }
      return { schluessel, zeile, satz: eindeutig ? satz : '', werte, ablage, sortierung: lies(this.sortierFeld) }
    })
    if (this.markeFeld !== '' || this.sortierFeld !== '') {
      const marken = markenLesen(this.marken)
      karten.sort((a, b) => vergleicheKarten({ ...a.werte, sortierung: a.sortierung }, { ...b.werte, sortierung: b.sortierung }, marken))
    }
    const treffer = auswahlWiederfinden(geberIdVon(this), karten, (k) => k.zeile, (k) => k.schluessel)
    this._gewaehlt = treffer.length > 0 ? karten[treffer[0]].schluessel : ''
    if (!karten.some((k) => k.schluessel === this._gezogen)) this._gezogen = ''
    this._karten = karten
    this._geliefert = true
    if (this._erwartet?.angekommen && !this._schreibt) this.bestaetigt()
  }

  private bestaetigt(): void {
    clearTimeout(this._warteTimer)
    this._erwartet = null
    this._meldung = 'Verschiebung in den geladenen Daten bestätigt.'
  }

  private waehle(karte: Karte): void {
    waehleAuswahl(geberIdVon(this), karte.zeile, karte.schluessel)
    runEvent(this, 'onCardClick', { PINDEX: karte.satz }).catch(meldeKettenFehler)
  }

  private async verschiebe(karte: Karte, ablage: Ablage): Promise<void> {
    if (this._schreibt) {
      this._meldung = 'Eine Verschiebung wird bereits gesendet. Bitte kurz warten.'
      return
    }
    if (karte.satz === '') {
      this._meldung = 'Diese Karte hat keine eindeutige Satznummer. Prüfe die Datenquelle im Editor.'
      return
    }
    const ziel = ablageSchluessel(ablage)
    if (ablageSchluessel(karte.ablage) === ziel) return
    clearTimeout(this._warteTimer)
    this._erwartet = { schluessel: karte.schluessel, ziel, angekommen: false }
    this._schreibt = true
    this._meldung = 'Verschiebung wird gesendet …'
    try {
      const werte = ablageWerte(this.spaltenListe(), ablage)
      const ergebnis = await runEvent(this, 'onCardDrop', { PINDEX: karte.satz, ...werte })
      if (ergebnis.abgebrochen) {
        this._erwartet = null
        this._meldung = 'Die Aktion ist fehlgeschlagen. Die Karte zeigt den zuletzt geladenen Stand.'
      } else if (!ergebnis.ausgefuehrt) {
        this._erwartet = null
        this._meldung = ergebnis.beschaeftigt
          ? 'Die Aktion läuft bereits.' : 'Für „Karte verschoben“ ist noch keine Aktion eingerichtet.'
      } else if (!ergebnis.geschrieben) {
        this._erwartet = null
        this._meldung = 'Aktion ausgeführt. Sie hat keine Daten geschrieben.'
      } else if (this._erwartet?.angekommen) {
        this.bestaetigt()
      } else {
        this._meldung = 'Gesendet. Die Karte wechselt ihren Platz, sobald neue Daten die Änderung bestätigen.'
        this._warteTimer = setTimeout(() => {
          if (this._erwartet) this._meldung = 'Die Verschiebung ist noch nicht durch neue Daten bestätigt. Angezeigt wird der zuletzt geladene Stand.'
        }, 20000)
      }
    } catch (fehler) {
      this._erwartet = null
      this._meldung = 'Verschiebung fehlgeschlagen. Bitte die Fehlermeldung beachten.'
      meldeKettenFehler(fehler)
    } finally {
      this._schreibt = false
    }
  }

  private karteMit(schluessel: string): Karte | undefined {
    return this._karten.find((k) => k.schluessel === schluessel)
  }

  private belegt(ablage: Ablage): number {
    const schluessel = ablageSchluessel(ablage)
    return this._karten.filter((k) => ablageSchluessel(k.ablage) === schluessel).length
  }

  private weiter(ereignis: Event, karte: Karte): void {
    ereignis.stopPropagation()
    const ziel = naechsteAblage(this.spaltenListe(), karte.ablage, (a) => this.belegt(a))
    if (ziel) void this.verschiebe(karte, ziel)
  }

  private beiTaste(ereignis: KeyboardEvent, karte: Karte): void {
    if (ereignis.target !== ereignis.currentTarget) return
    if (ereignis.key !== 'Enter' && ereignis.key !== ' ') return
    ereignis.preventDefault()
    this.waehle(karte)
  }

  private zugBeginnt(ereignis: DragEvent, karte: Karte): void {
    if (this._schreibt || karte.satz === '') { ereignis.preventDefault(); return }
    ereignis.dataTransfer?.setData('text/plain', karte.satz)
    if (ereignis.dataTransfer) ereignis.dataTransfer.effectAllowed = 'move'
    this._gezogen = karte.schluessel
  }

  private zugEndet(): void {
    this._gezogen = ''
    this._ziel = ''
  }

  private ueberAblage(ereignis: DragEvent, ablage: Ablage): void {
    if (this._gezogen === '' || this._schreibt) return
    ereignis.preventDefault()
    ereignis.stopPropagation()
    if (ereignis.dataTransfer) ereignis.dataTransfer.dropEffect = 'move'
    this._ziel = ablageSchluessel(ablage)
  }

  private abgelegt(ereignis: DragEvent, ablage: Ablage): void {
    const karte = this.karteMit(this._gezogen)
    this.zugEndet()
    if (!karte) return
    ereignis.preventDefault()
    ereignis.stopPropagation()
    void this.verschiebe(karte, ablage)
  }

  // Ein Zeiger taugt nicht auf jedem Geraet: dieselbe Verschiebung geht auch
  // ueber die Wahl eines Ziels.
  private zielGewaehlt(ereignis: Event, karte: Karte): void {
    const feld = ereignis.currentTarget as HTMLSelectElement
    const ziel = alleAblagen(this.spaltenListe()).find((a) => ablageSchluessel(a) === feld.value)
    feld.value = ablageSchluessel(karte.ablage)
    if (ziel) void this.verschiebe(karte, ziel)
  }

  // Der Knopf traegt die Farbe der Spalte, in die er die Karte schiebt.
  private knopf(spalten: readonly TafelSpalte[], von: Ablage, karte: Karte | null): TemplateResult | typeof nothing {
    const text = spalten[von.spalte].knopf.trim()
    const ziel = naechsteAblage(spalten, von, (a) => this.belegt(a))
    if (text === '' || !ziel) return nothing
    return html`<button type="button" class="weiter v-${farbweltWert(spalten[ziel.spalte].farbwelt)}"
      draggable="false" ?disabled=${karte === null || this._schreibt || karte.satz === ''}
      @click=${(e: Event) => { if (karte) this.weiter(e, karte) }}>${text}</button>`
  }

  // Ohne Karte zeichnet der Editor die Form: jede gebundene Stelle als Strich.
  private karte(spalten: readonly TafelSpalte[], ablage: Ablage, karte: Karte | null): TemplateResult {
    const inhalt = html`${karteInhalt(karte?.werte ?? null, {
      gebunden: (s) => this.feldVon(s) !== '',
      bildArt: this.bildArt,
      chipFarbwelt: this.chipFarbwelt,
      marken: markenLesen(this.marken),
    })}${this.knopf(spalten, ablage, karte)}`
    if (karte === null) return html`<div class="karte">${inhalt}</div>`
    const gewaehlt = karte.schluessel === this._gewaehlt
    const hervor = this.markeFeld !== '' && markeVon(karte.werte.marke, markenLesen(this.marken)).farbwelt === 'danger'
    const titel = karte.werte.titel || 'Karte'
    return html`<div
      class="karte${gewaehlt ? ' gewaehlt' : ''}${hervor ? ' hervor' : ''}${karte.schluessel === this._gezogen ? ' zieht' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${String(gewaehlt)}
      aria-label=${karte.satz === '' ? `${titel} – keine eindeutige Satznummer, Verschieben nicht möglich` : titel}
      draggable=${karte.satz !== '' && !this._schreibt ? 'true' : 'false'}
      @click=${() => this.waehle(karte)}
      @keydown=${(e: KeyboardEvent) => this.beiTaste(e, karte)}
      @dragstart=${(e: DragEvent) => this.zugBeginnt(e, karte)}
      @dragend=${this.zugEndet}
    >${inhalt}</div>`
  }

  private kartenIn(spalten: readonly TafelSpalte[], ablage: Ablage): TemplateResult | TemplateResult[] {
    if (this.imEditor) return this.karte(spalten, ablage, null)
    const schluessel = ablageSchluessel(ablage)
    return this._karten.filter((k) => ablageSchluessel(k.ablage) === schluessel).map((k) => this.karte(spalten, ablage, k))
  }

  private ablage(ablage: Ablage, klasse: string, inhalt: TemplateResult): TemplateResult {
    const ziel = this._ziel === ablageSchluessel(ablage)
    return html`<div
      class="${klasse} ablage${ziel ? ' ziel' : ''}"
      @dragover=${(e: DragEvent) => this.ueberAblage(e, ablage)}
      @drop=${(e: DragEvent) => this.abgelegt(e, ablage)}
    >${inhalt}</div>`
  }

  // Eine Spalte mit einem Platz zeigt nur ihre Ueberschrift; mehrere Plaetze
  // stehen als eigene Kaesten mit ihrem Namen darin.
  private spalte(spalten: readonly TafelSpalte[], spalte: TafelSpalte, index: number): TemplateResult | typeof nothing {
    const imEditor = this.imEditor
    const gezeigt = imEditor ? spalte.plaetze.map((_, i) => i) : sichtbarePlaetze(spalte)
    if (gezeigt.length === 0) return nothing
    const zeigtZahl = this._geliefert && !imEditor
    const ablage = (platz: number): Ablage => ({ spalte: index, platz })
    const leer = (a: Ablage): boolean => zeigtZahl && this.belegt(a) === 0
    const blass = (a: Ablage): string => (istSichtbar(spalten, a) ? '' : ' versteckt')
    const rumpf = gezeigt.length === 1
      ? html`${this.kartenIn(spalten, ablage(gezeigt[0]))}
          ${leer(ablage(gezeigt[0])) ? leerZustand(this.leerText) : nothing}`
      : html`${gezeigt.map((pi) => this.ablage(ablage(pi), `platz${blass(ablage(pi))}`, html`
          <div class="platzkopf"><span>${spalte.plaetze[pi].name}</span>
            ${istSichtbar(spalten, ablage(pi)) ? nothing : html`<span class="hinweis">in der Maske nicht gezeigt</span>`}
            <span class="platzzahl">${zeigtZahl ? this.belegt(ablage(pi)) : STRICH}</span></div>
          <div class="platzrumpf">
            ${this.kartenIn(spalten, ablage(pi))}
            ${leer(ablage(pi)) ? html`<div class="frei">${PLATZ_LEER}</div>` : nothing}
          </div>`))}`
    const anzahl = gezeigt.reduce((summe, pi) => summe + this.belegt(ablage(pi)), 0)
    const einzigerVersteckt = gezeigt.length === 1 && !istSichtbar(spalten, ablage(gezeigt[0]))
    return this.ablage(ablage(gezeigt[0]), `spalte v-${farbweltWert(spalte.farbwelt)}${einzigerVersteckt ? ' versteckt' : ''}`, html`
      <div class="spaltenkopf">
        <span class="punkt"></span>
        <span class="titel">${spalte.titel}</span>
        ${einzigerVersteckt ? html`<span class="hinweis">in der Maske nicht gezeigt</span>` : nothing}
        <span class="anzahl">${zeigtZahl ? anzahl : STRICH}</span>
      </div>
      <div class="rumpf">${rumpf}</div>`)
  }

  private bedienung(): TemplateResult | typeof nothing {
    const karte = this.imEditor ? undefined : this.karteMit(this._gewaehlt)
    if (!karte) return nothing
    const spalten = this.spaltenListe()
    const aktuell = ablageSchluessel(karte.ablage)
    return html`<label class="bedienung">
      <span>${karte.werte.titel || 'Gewählte Karte'} verschieben nach</span>
      <select aria-label="Ziel für die gewählte Karte" ?disabled=${this._schreibt}
        @change=${(e: Event) => this.zielGewaehlt(e, karte)}>
        ${alleAblagen(spalten).map((a) => html`<option value=${ablageSchluessel(a)}
          ?selected=${ablageSchluessel(a) === aktuell}>${ablageName(spalten, a)}</option>`)}
      </select>
    </label>`
  }

  override render(): TemplateResult {
    const spalten = this.spaltenListe()
    return html`
      <p class="meldung" role="status" aria-live="polite">${this._meldung}</p>
      ${this.bedienung()}
      <div class="tafel" aria-busy=${String(this._schreibt)}>
        ${spalten.map((s, i) => this.spalte(spalten, s, i))}
      </div>`
  }
}

Grundbaustein.defineAndRegister(Tafel)
