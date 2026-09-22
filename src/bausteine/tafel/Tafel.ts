// Baustein Kanban (neu): eine Tafel, die Spalten, Unterteilungen und Karten selbst zeichnet.
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
import { farbweltEigenschaft, farbweltStil, farbweltWert, type FarbweltWert } from '../faehigkeiten/farbwelt'
import { LEER_TEXT_STANDARD, leerStil, leerTextEigenschaft, leerZustand } from '../faehigkeiten/leerZustand'
import { holeDatenVorspann, macheDatenAnschluss, tagFeldEigenschaft } from '../faehigkeiten/quelle'
import {
  ablageFuer,
  ablageName,
  ablageSchluessel,
  ablageWerte,
  alleAblagen,
  standardTafelSpalten,
  tafelSpaltenEigenschaft,
  tafelSpaltenLesen,
  unterteilungenVon,
  zeigtAuf,
  type Ablage,
  type TafelSpalte,
} from '../faehigkeiten/tafelSpalten'
import { tafelStil } from './tafelStil'

type Stelle = 'titel' | 'unterzeile' | 'text' | 'datum' | 'zeit' | 'chip' | 'bild'

const STELLEN: readonly { stelle: Stelle; name: string }[] = [
  { stelle: 'titel', name: 'Titel' },
  { stelle: 'unterzeile', name: 'Unterzeile' },
  { stelle: 'text', name: 'Text' },
  { stelle: 'datum', name: 'Datum' },
  { stelle: 'zeit', name: 'Zeit' },
  { stelle: 'chip', name: 'Chip' },
  { stelle: 'bild', name: 'Avatar (Bild)' },
]

const STRICH = '—'
const UNTERTEILUNG_LEER = 'frei · hierher ziehen'

interface Karte {
  schluessel: string
  zeile: unknown
  satz: string
  werte: Record<Stelle, string>
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
    titelFeld: '',
    unterzeileFeld: '',
    textFeld: '',
    datumFeld: '',
    zeitFeld: '',
    chipFeld: '',
    bildFeld: '',
  }

  static override readonly eigenschaften: Eigenschaft[] = [
    tafelSpaltenEigenschaft(),
    {
      ...farbweltEigenschaft('chipFarbwelt', 'Bedeutung des Chips auf den Karten — bestimmt die Chip-Farbe.'),
      name: 'Farbe des Chips',
      bearbeitung: 'inspector',
    },
    leerTextEigenschaft(),
    {
      schluessel: 'spaltenFeld',
      name: 'Einsortieren nach',
      beschreibung: 'Feld, das die Spalte bestimmt. Leer: alle in die Auffangspalte.',
      art: 'field',
    },
    tagFeldEigenschaft(),
    ...STELLEN.map(({ stelle, name }): Eigenschaft => ({
      schluessel: `${stelle}Feld`,
      name: `Karte: ${name}`,
      beschreibung: stelle === 'bild'
        ? 'Feld mit dem Bild der Karte (Adresse oder Pfad). Leer: kein Avatar.'
        : `Feld, das auf jeder Karte als ${name} steht. Leer: die Stelle fehlt.`,
      art: 'field',
    })),
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, leerStil, farbweltStil, tafelStil]

  @property({
    converter: {
      fromAttribute: (v: string | null): TafelSpalte[] => tafelSpaltenLesen(v ?? undefined),
      toAttribute: (v: TafelSpalte[]): string => JSON.stringify(v),
    },
  })
  spalten: TafelSpalte[] = standardTafelSpalten()

  @property() quelle = ''
  @property() spaltenFeld = ''
  @property() tagFeld = ''
  @property() leerText = LEER_TEXT_STANDARD
  @property() chipFarbwelt: FarbweltWert = 'info'
  @property() titelFeld = ''
  @property() unterzeileFeld = ''
  @property() textFeld = ''
  @property() datumFeld = ''
  @property() zeitFeld = ''
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
    const karten = vorspann.zeilen.map((zeile): Karte => {
      const satz = satzIndexVon(vorspann.quelle, zeile)
      const eindeutig = satz !== '' && satzAnzahl.get(satz) === 1
      const basis = JSON.stringify([vorspann.quelle.id, eindeutig ? 'satz' : 'inhalt', eindeutig ? satz : merkmalVon(zeile)])
      const nummer = vorkommen.get(basis) ?? 0
      vorkommen.set(basis, nummer + 1)
      const lies = (feld: string): string => (feld === '' ? '' : vorspann.lies(zeile, feld))
      const werte = Object.fromEntries(STELLEN.map(({ stelle }) => [stelle, lies(this.feldVon(stelle))]))
      const schluessel = `${basis}:${nummer}`
      const ablage = ablageFuer(spalten, this.spaltenFeld, lies)
      const erwartet = this._erwartet
      if (lieferung && erwartet?.schluessel === schluessel) {
        erwartet.angekommen = ablageSchluessel(ablage) === erwartet.ziel
          && zeigtAuf(spalten, this.spaltenFeld, ablage, lies)
      }
      return { schluessel, zeile, satz: eindeutig ? satz : '', werte: werte as Record<Stelle, string>, ablage }
    })
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
      const ergebnis = await runEvent(this, 'onCardDrop', { PINDEX: karte.satz, ...ablageWerte(this.spaltenListe(), ablage) })
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

  private beiTaste(ereignis: KeyboardEvent, karte: Karte): void {
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

  private stelle(stelle: Stelle, klasse: string, wert: string): TemplateResult {
    return html`<span class=${klasse} data-ff-spot=${stelle}>${wert.trim() === '' ? STRICH : wert}</span>`
  }

  private bild(wert: string): TemplateResult {
    return html`<span class="bild" data-ff-spot="bild">${wert.trim() === ''
      ? nothing
      : html`<img src=${wert} alt="" @error=${(e: Event) => { (e.target as HTMLElement).hidden = true }}>`}</span>`
  }

  // Ohne Karte zeichnet der Editor die Form: jede gebundene Stelle als Strich.
  // In der Maske fehlt eine Stelle, deren Feld leer ist.
  private karte(karte: Karte | null): TemplateResult {
    const gebunden = (s: Stelle): boolean => this.feldVon(s) !== ''
    const wert = (s: Stelle): string => karte?.werte[s] ?? ''
    const zeigt = (s: Stelle): boolean => gebunden(s) && (karte === null || wert(s).trim() !== '')
    const leer = !STELLEN.some(({ stelle }) => zeigt(stelle))
    const kopf = zeigt('bild') || zeigt('titel') || zeigt('unterzeile') || leer
    const fuss = zeigt('datum') || zeigt('zeit') || zeigt('chip')
    const inhalt = html`
      ${kopf ? html`<div class="kopf">
        ${zeigt('bild') ? this.bild(wert('bild')) : nothing}
        <div class="namen">
          ${zeigt('titel') || leer ? this.stelle('titel', 'name', wert('titel')) : nothing}
          ${zeigt('unterzeile') ? this.stelle('unterzeile', 'zusatz', wert('unterzeile')) : nothing}
        </div>
      </div>` : nothing}
      ${zeigt('text') ? this.stelle('text', 'grund', wert('text')) : nothing}
      ${fuss ? html`<div class="fuss">
        ${zeigt('datum') ? this.stelle('datum', 'datum', wert('datum')) : nothing}
        ${zeigt('zeit') ? this.stelle('zeit', 'zeit', wert('zeit')) : nothing}
        ${zeigt('chip') ? this.stelle('chip', `chip v-${farbweltWert(this.chipFarbwelt)}`, wert('chip')) : nothing}
      </div>` : nothing}`
    if (karte === null) return html`<div class="karte">${inhalt}</div>`
    const gewaehlt = karte.schluessel === this._gewaehlt
    const titel = wert('titel') || 'Karte'
    return html`<div
      class="karte${gewaehlt ? ' gewaehlt' : ''}${karte.schluessel === this._gezogen ? ' zieht' : ''}"
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

  private kartenIn(ablage: Ablage): TemplateResult | TemplateResult[] {
    if (this.imEditor) return this.karte(null)
    const schluessel = ablageSchluessel(ablage)
    return this._karten.filter((k) => ablageSchluessel(k.ablage) === schluessel).map((k) => this.karte(k))
  }

  private ablage(ablage: Ablage, klasse: string, inhalt: TemplateResult): TemplateResult {
    const ziel = this._ziel === ablageSchluessel(ablage)
    return html`<div
      class="${klasse} ablage${ziel ? ' ziel' : ''}"
      @dragover=${(e: DragEvent) => this.ueberAblage(e, ablage)}
      @drop=${(e: DragEvent) => this.abgelegt(e, ablage)}
    >${inhalt}</div>`
  }

  private spalte(spalte: TafelSpalte, index: number): TemplateResult {
    const unter = unterteilungenVon(spalte)
    const anzahl = this._karten.filter((k) => k.ablage.spalte === index).length
    const leer = (ablage: Ablage): boolean => this._geliefert && !this.imEditor
      && !this._karten.some((k) => ablageSchluessel(k.ablage) === ablageSchluessel(ablage))
    const rumpf = unter.length === 0
      ? html`${this.kartenIn({ spalte: index, unterteilung: -1 })}
          ${leer({ spalte: index, unterteilung: -1 }) ? leerZustand(this.leerText) : nothing}`
      : html`${unter.map((u, i) => this.ablage({ spalte: index, unterteilung: i }, 'unterteilung', html`
          <div class="unterkopf">${u.titel}</div>
          ${this.kartenIn({ spalte: index, unterteilung: i })}
          ${leer({ spalte: index, unterteilung: i }) ? html`<div class="frei">${UNTERTEILUNG_LEER}</div>` : nothing}`))}`
    return this.ablage({ spalte: index, unterteilung: unter.length === 0 ? -1 : 0 }, `spalte v-${farbweltWert(spalte.farbwelt)}`, html`
      <div class="spaltenkopf">
        <span class="punkt"></span>
        <span class="titel">${spalte.titel}</span>
        <span class="anzahl">${this._geliefert && !this.imEditor ? anzahl : STRICH}</span>
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
    return html`
      <p class="meldung" role="status" aria-live="polite">${this._meldung}</p>
      ${this.bedienung()}
      <div class="tafel" aria-busy=${String(this._schreibt)}>
        ${this.spaltenListe().map((s, i) => this.spalte(s, i))}
      </div>`
  }
}

Grundbaustein.defineAndRegister(Tafel)
