// Faehigkeit Kartentafel: sortiert die Zeilen einer Quelle als Karten in
// Spalten und Unterteilungen, zieht sie um und schreibt den Umzug ins ERP.
import { css } from 'lit'
import { bindungsAttr, faehigkeit } from '../../kern/maske/faehigkeiten'
import { feldLesen, satzIndexVon } from '../../softengine/data'
import { auswahlWiederfinden, geberIdVon, merkmalVon, waehleAuswahl } from './auswahl'
import { holeDatenVorspann, macheDatenAnschluss } from './quelle'
import { LEER_TEXT_STANDARD } from './leerZustand'
import { meldeKettenFehler, runEvent } from './ereignisse'
import { Karte } from '../karte/Karte'

// Die Tafel liest ihre Teile aus dem DOM, also gehoeren deren Tags und
// Standardtitel hierher: holte sie die aus den Bausteinen, brauchten die
// Bausteine und diese Faehigkeit einander im Kreis (tools/laufzeitBauen.mjs).
export const SPALTE_TAG = 'ff-kanban-spalte'
export const ZIMMER_TAG = 'ff-kanban-zimmer'
export const SPALTE_TITEL_STANDARD = 'Neue Spalte'
export const ZIMMER_TITEL_STANDARD = 'Neue Unterteilung'
export const ZIMMER_LEER_TEXT = 'frei · hierher ziehen'
export const ZIMMER_INHALT_EVENT = 'ff-zimmer-inhalt'
export const VERSCHIEBEN_EVENT = 'ff-kanban-verschieben'

export const KARTE_TYP = Karte.typ
export const KARTE_TAG = Karte.tag

// Jede Flaeche der Tafel, die eine Karte aufnimmt, sieht gleich aus: dieselbe
// Luft zwischen den Kaertchen, dieselbe Hervorhebung unter einem gezogenen.
export const ZIEL_KLASSE = 'ziel'

export const tafelFlaechenStil = css`
  ::slotted(*) { margin-top: 24px; }
  slot { display: contents; }

  :host([data-ff-ziel]) .ziel {
    background: var(--se-accent-soft);
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }
`

export interface TafelZiel {
  id: string
  name: string
}

interface TafelBedienung extends HTMLElement {
  meldung: string
  beschaeftigt: boolean
  auswahlTitel: string
  aktuellesZiel: string
  ziele: TafelZiel[]
}

interface KartenDaten { zeile: unknown; satz: string; schluessel: string }

interface TafelStand {
  karten: Map<string, HTMLElement>
  ausgewaehlt: HTMLElement | null
  ziele: Map<string, { spalte: HTMLElement; zimmer: HTMLElement | null }>
  schreibt: boolean
  erwartet: { schluessel: string; ziel: HTMLElement; angekommen: boolean } | null
  warteTimer?: ReturnType<typeof setTimeout>
}

const vorlagen = new WeakMap<HTMLElement, HTMLElement>()
const staende = new WeakMap<HTMLElement, TafelStand>()
const kartenDaten = new WeakMap<HTMLElement, KartenDaten>()
const verbindungen = new WeakMap<HTMLElement, () => void>()
let gezogen: { karte: HTMLElement; tafel: HTMLElement } | null = null
let ziel: HTMLElement | null = null
const ZIEHT_ATTR = 'data-ff-zieht'
const ZIEL_ATTR = 'data-ff-ziel'

function platzMitWert(wert: string, werte: readonly string[]): number {
  const gesucht = wert.trim().toLowerCase()
  if (gesucht !== '') {
    for (let i = 0; i < werte.length; i++) {
      const kandidat = werte[i].trim().toLowerCase()
      if (kandidat !== '' && kandidat === gesucht) return i
    }
  }
  return -1
}

function auffangPlatz(schalter: readonly (string | null | undefined)[]): number {
  return schalter.findIndex((s) => (s ?? '').trim() === 'ja')
}

function kinderMitTag(el: HTMLElement, tag: string): HTMLElement[] {
  return Array.from(el.children).filter(
    (kind): kind is HTMLElement => kind.tagName.toLowerCase() === tag,
  )
}

function spaltenVon(tafel: HTMLElement): HTMLElement[] {
  return kinderMitTag(tafel, SPALTE_TAG)
}

function zimmerVon(spalte: HTMLElement): HTMLElement[] {
  return kinderMitTag(spalte, ZIMMER_TAG)
}

function kartenVon(flaeche: HTMLElement): HTMLElement[] {
  return kinderMitTag(flaeche, KARTE_TAG)
}

function setzeLeerHinweise(tafel: HTMLElement, spalten: readonly HTMLElement[]): void {
  const satz = tafel.getAttribute('leertext') ?? LEER_TEXT_STANDARD
  const setze = (el: HTMLElement, text: string): void => {
    (el as unknown as { leerHinweis: string }).leerHinweis = text
  }
  for (const spalte of spalten) {
    const zimmer = zimmerVon(spalte)
    for (const z of zimmer) setze(z, kartenVon(z).length === 0 ? ZIMMER_LEER_TEXT : '')
    setze(spalte, zimmer.length === 0 && kartenVon(spalte).length === 0 ? satz : '')
  }
}

// Der Wert, den das ERP kennt. Der Titel ist Anzeige: umbenennen darf die
// Zuordnung nicht verstellen. Nur wenn niemand einen Wert gesetzt hat, bleibt
// es beim Titel, sonst ginge nach dem Anlegen einer Spalte gar nichts hinaus.
function zuordnungsWert(el: HTMLElement, standardTitel: string): string {
  const wert = (el.getAttribute('wert') ?? '').trim()
  if (wert !== '') return wert
  return el.getAttribute('titel') ?? standardTitel
}

function zielZimmer(spalte: HTMLElement, zeile: unknown): HTMLElement | null {
  const zimmer = zimmerVon(spalte)
  if (zimmer.length === 0) return null
  const feld = spalte.getAttribute('unterteilungsfeld') ?? ''
  if (feld === '') return zimmer[0]

  const werte = zimmer.map((z) => zuordnungsWert(z, ZIMMER_TITEL_STANDARD))
  const platz = platzMitWert(feldLesen(zeile, feld), werte)
  return platz >= 0 ? zimmer[platz] : zimmer[0]
}

function standVon(tafel: HTMLElement): TafelStand {
  let stand = staende.get(tafel)
  if (!stand) {
    stand = { karten: new Map(), ausgewaehlt: null, ziele: new Map(), schreibt: false, erwartet: null }
    staende.set(tafel, stand)
  }
  return stand
}

function bedienung(tafel: HTMLElement): TafelBedienung {
  return tafel as TafelBedienung
}

function titelVon(karte: HTMLElement, ohneTitel: string): string {
  return String((karte as Karte).titel || ohneTitel)
}

function markiereZiel(neu: HTMLElement | null): void {
  if (ziel === neu) return
  ziel?.removeAttribute(ZIEL_ATTR)
  ziel = neu
  ziel?.setAttribute(ZIEL_ATTR, '')
}

function beendeZug(): void {
  gezogen?.karte.removeAttribute(ZIEHT_ATTR)
  gezogen = null
  markiereZiel(null)
}

function zeigeSchreibstand(tafel: HTMLElement, schreibt: boolean): void {
  const stand = standVon(tafel)
  stand.schreibt = schreibt
  bedienung(tafel).beschaeftigt = schreibt
  tafel.setAttribute('aria-busy', String(schreibt))
  for (const karte of stand.karten.values()) {
    karte.draggable = !schreibt && (kartenDaten.get(karte)?.satz ?? '') !== ''
  }
}

function aktualisiereBedienung(tafel: HTMLElement): void {
  const stand = standVon(tafel)
  const karte = stand.ausgewaehlt
  bedienung(tafel).auswahlTitel = karte ? titelVon(karte, 'Gewählte Karte') : ''
  bedienung(tafel).aktuellesZiel = karte
    ? [...stand.ziele].find(([, z]) => (z.zimmer ?? z.spalte) === karte.parentElement)?.[0] ?? '' : ''
}

function vorlageVon(tafel: HTMLElement): HTMLElement | undefined {
  let vorlage = vorlagen.get(tafel)
  if (vorlage) return vorlage
  const quelle = tafel.querySelector<HTMLTemplateElement>('template[data-ff-template]')
    ?.content.firstElementChild
  if (!quelle) return undefined
  vorlage = quelle.cloneNode(true) as HTMLElement
  vorlagen.set(tafel, vorlage)
  return vorlage
}

// Die Ziele der Tafel: je Spalte ihre Unterteilungen, sonst die Spalte selbst.
function sammleZiele(tafel: HTMLElement, spalten: readonly HTMLElement[]): TafelStand['ziele'] {
  const ziele = new Map<string, { spalte: HTMLElement; zimmer: HTMLElement | null }>()
  const liste: TafelZiel[] = []
  spalten.forEach((spalte, si) => {
    const zimmer = zimmerVon(spalte)
    for (const [zi, raum] of (zimmer.length > 0 ? zimmer : [null]).entries()) {
      const id = `${si}:${zi}`
      ziele.set(id, { spalte, zimmer: raum })
      const name = spalte.getAttribute('titel') ?? SPALTE_TITEL_STANDARD
      liste.push({ id, name: raum ? `${name} / ${raum.getAttribute('titel') ?? 'Unterteilung'}` : name })
    }
  })
  bedienung(tafel).ziele = liste
  return ziele
}

function hydriere(tafel: HTMLElement, lieferung: boolean): void {
  const stand = standVon(tafel)
  const vorspann = holeDatenVorspann(tafel)
  const spalten = spaltenVon(tafel)
  if (!vorspann || spalten.length === 0) return
  const vorlage = vorlageVon(tafel)
  if (!vorlage) return

  stand.ziele = sammleZiele(tafel, spalten)

  const spaltenFeld = tafel.getAttribute('spaltenfeld') ?? ''
  const werte = spalten.map((s) => zuordnungsWert(s, SPALTE_TITEL_STANDARD))
  const auffang = auffangPlatz(spalten.map((s) => s.getAttribute('auffang')))
  const stellen = faehigkeit({ faehigkeiten: Karte.faehigkeiten }, 'bindbar')?.stellen ?? []
  if (lieferung && stand.erwartet) stand.erwartet.angekommen = false
  const naechste = new Map<string, HTMLElement>()
  const reihenfolge = new Map<HTMLElement, HTMLElement[]>()
  const vorkommen = new Map<string, number>()
  const satzAnzahl = new Map<string, number>()
  for (const zeile of vorspann.zeilen) {
    const satz = satzIndexVon(vorspann.quelle, zeile)
    if (satz !== '') satzAnzahl.set(satz, (satzAnzahl.get(satz) ?? 0) + 1)
  }
  for (const zeile of vorspann.zeilen) {
    const satz = satzIndexVon(vorspann.quelle, zeile)
    const eindeutig = satz !== '' && satzAnzahl.get(satz) === 1
    const basis = JSON.stringify([vorspann.quelle.id, eindeutig ? 'satz' : 'inhalt', eindeutig ? satz : merkmalVon(zeile)])
    const nummer = vorkommen.get(basis) ?? 0
    vorkommen.set(basis, nummer + 1)
    const schluessel = `${basis}:${nummer}`
    const karte = stand.karten.get(schluessel) ?? vorlage.cloneNode(true) as HTMLElement
    naechste.set(schluessel, karte)
    kartenDaten.set(karte, { zeile, satz: eindeutig ? satz : '', schluessel })
    karte.draggable = !stand.schreibt && eindeutig
    karte.tabIndex = 0
    karte.setAttribute('role', 'button')
    for (const stelle of stellen) {
      const feld = karte.getAttribute(bindungsAttr(stelle.prop)) ?? ''
      if (feld !== '') (karte as unknown as Record<string, unknown>)[stelle.prop] = vorspann.lies(zeile, feld)
    }
    const titel = titelVon(karte, 'Karte')
    karte.setAttribute('aria-label', eindeutig ? titel : `${titel} – keine eindeutige Satznummer, Verschieben nicht möglich`)
    const platz = spaltenFeld === '' ? -1 : platzMitWert(feldLesen(zeile, spaltenFeld), werte)
    const spalte = spalten[platz >= 0 ? platz : auffang >= 0 ? auffang : 0]
    const ablage = zielZimmer(spalte, zeile) ?? spalte
    const liste = reihenfolge.get(ablage) ?? []
    liste.push(karte)
    reihenfolge.set(ablage, liste)
    if (lieferung && stand.erwartet?.schluessel === schluessel && stand.erwartet.ziel === ablage) {
      const spaltePasst = spaltenFeld !== '' && platzMitWert(feldLesen(zeile, spaltenFeld),
        [zuordnungsWert(spalte, SPALTE_TITEL_STANDARD)]) === 0
      const zimmerFeld = spalte.getAttribute('unterteilungsfeld') ?? ''
      const zimmerPasst = ablage === spalte || (zimmerFeld !== '' && platzMitWert(feldLesen(zeile, zimmerFeld),
        [zuordnungsWert(ablage, ZIMMER_TITEL_STANDARD)]) === 0)
      stand.erwartet.angekommen = spaltePasst && zimmerPasst
    }
  }
  for (const [schluessel, karte] of stand.karten) {
    if (naechste.has(schluessel)) continue
    if (gezogen?.karte === karte) beendeZug()
    karte.remove()
  }
  stand.karten = naechste
  for (const [ablage, karten] of reihenfolge) {
    let anker: Element | null = kartenVon(ablage)[0] ?? null
    for (const karte of karten) {
      if (karte === anker) anker = anker.nextElementSibling
      else {
        if (gezogen?.karte === karte) beendeZug()
        ablage.insertBefore(karte, anker)
      }
    }
  }
  setzeLeerHinweise(tafel, spalten)
  const karten = [...naechste.values()]
  const treffer = new Set(auswahlWiederfinden(geberIdVon(tafel), karten,
    (karte) => kartenDaten.get(karte)?.zeile, (karte) => kartenDaten.get(karte)?.schluessel ?? ''))
  karten.forEach((karte, i) => {
    karte.toggleAttribute('data-ff-auswahl', treffer.has(i))
    karte.setAttribute('aria-pressed', String(treffer.has(i)))
  })
  stand.ausgewaehlt = karten.find((_, i) => treffer.has(i)) ?? null
  aktualisiereBedienung(tafel)
  if (stand.erwartet?.angekommen && !stand.schreibt) bestaetigt(tafel)
}

function bestaetigt(tafel: HTMLElement): void {
  const stand = standVon(tafel)
  clearTimeout(stand.warteTimer)
  stand.erwartet = null
  bedienung(tafel).meldung = 'Verschiebung in den geladenen Daten bestätigt.'
}

function flaecheAusEreignis(tafel: HTMLElement, ereignis: Event, tag: string): HTMLElement | null {
  for (const el of ereignis.composedPath()) {
    if (el instanceof HTMLElement && el.tagName.toLowerCase() === tag && tafel.contains(el)) return el
  }
  return null
}

function karteAusEreignis(tafel: HTMLElement, ereignis: Event): HTMLElement | null {
  const karte = flaecheAusEreignis(tafel, ereignis, KARTE_TAG)
  return karte && kartenDaten.has(karte) ? karte : null
}

async function verschiebe(
  tafel: HTMLElement,
  karte: HTMLElement,
  spalte: HTMLElement,
  zimmer: HTMLElement | null,
): Promise<void> {
  const stand = standVon(tafel)
  if (stand.schreibt) {
    bedienung(tafel).meldung = 'Eine Verschiebung wird bereits gesendet. Bitte kurz warten.'
    return
  }
  const daten = kartenDaten.get(karte)
  if (!daten || daten.satz === '') {
    bedienung(tafel).meldung = 'Diese Karte hat keine eindeutige Satznummer. Prüfe die Datenquelle im Editor.'
    return
  }
  const ablage = zimmer ?? zimmerVon(spalte)[0] ?? spalte
  if (karte.parentElement === ablage) return
  clearTimeout(stand.warteTimer)
  stand.erwartet = { schluessel: daten.schluessel, ziel: ablage, angekommen: false }
  zeigeSchreibstand(tafel, true)
  bedienung(tafel).meldung = 'Verschiebung wird gesendet …'
  try {
    const ergebnis = await runEvent(tafel, 'onCardDrop', {
      PINDEX: daten.satz,
      VALUE: zuordnungsWert(spalte, SPALTE_TITEL_STANDARD),
      ZIMMER: ablage === spalte ? '' : zuordnungsWert(ablage, ZIMMER_TITEL_STANDARD),
    })
    if (ergebnis.abgebrochen) {
      stand.erwartet = null
      bedienung(tafel).meldung = 'Die Aktion ist fehlgeschlagen. Die Karte zeigt den zuletzt geladenen Stand.'
    } else if (!ergebnis.ausgefuehrt) {
      stand.erwartet = null
      bedienung(tafel).meldung = ergebnis.beschaeftigt
        ? 'Die Aktion läuft bereits.' : 'Für „Karte verschoben“ ist noch keine Aktion eingerichtet.'
    } else if (!ergebnis.geschrieben) {
      stand.erwartet = null
      bedienung(tafel).meldung = 'Aktion ausgeführt. Sie hat keine Daten geschrieben.'
    } else if (stand.erwartet?.angekommen) {
      bestaetigt(tafel)
    } else {
      bedienung(tafel).meldung = 'Gesendet. Die Karte wechselt ihren Platz, sobald neue Daten die Änderung bestätigen.'
      stand.warteTimer = setTimeout(() => {
        if (stand.erwartet) bedienung(tafel).meldung = 'Die Verschiebung ist noch nicht durch neue Daten bestätigt. Angezeigt wird der zuletzt geladene Stand.'
      }, 20000)
    }
  } catch (fehler) {
    stand.erwartet = null
    bedienung(tafel).meldung = 'Verschiebung fehlgeschlagen. Bitte die Fehlermeldung beachten.'
    meldeKettenFehler(fehler)
  } finally {
    zeigeSchreibstand(tafel, false)
  }
}

function verdrahteZiehen(tafel: HTMLElement): void {
  if (verbindungen.has(tafel)) return
  const abmelden: (() => void)[] = []
  const auf = <K extends keyof HTMLElementEventMap>(name: K, fn: (e: HTMLElementEventMap[K]) => void): void => {
    tafel.addEventListener(name, fn)
    abmelden.push(() => tafel.removeEventListener(name, fn))
  }
  const waehle = (karte: HTMLElement): void => {
    const daten = kartenDaten.get(karte)
    if (!daten) return
    waehleAuswahl(geberIdVon(tafel), daten.zeile, daten.schluessel)
    runEvent(tafel, 'onCardClick', { PINDEX: daten.satz }).catch(meldeKettenFehler)
  }
  auf('click', (ereignis) => {
    const karte = karteAusEreignis(tafel, ereignis)
    if (karte) waehle(karte)
  })
  auf('keydown', (ereignis) => {
    if (ereignis.key !== 'Enter' && ereignis.key !== ' ') return
    const karte = karteAusEreignis(tafel, ereignis)
    if (!karte || ereignis.target !== karte) return
    ereignis.preventDefault()
    waehle(karte)
  })
  auf('dragstart', (ereignis) => {
    const karte = karteAusEreignis(tafel, ereignis)
    if (!karte) return
    if (standVon(tafel).schreibt || !karte.draggable) { ereignis.preventDefault(); return }
    gezogen = { karte, tafel }
    ereignis.dataTransfer?.setData('text/plain', kartenDaten.get(karte)?.satz ?? '')
    if (ereignis.dataTransfer) ereignis.dataTransfer.effectAllowed = 'move'
    setTimeout(() => { if (gezogen?.karte === karte) karte.setAttribute(ZIEHT_ATTR, '') }, 0)
  })
  auf('dragend', beendeZug)
  auf('dragover', (ereignis) => {
    const spalte = flaecheAusEreignis(tafel, ereignis, SPALTE_TAG)
    if (gezogen?.tafel !== tafel || !spalte || standVon(tafel).schreibt) return
    ereignis.preventDefault()
    if (ereignis.dataTransfer) ereignis.dataTransfer.dropEffect = 'move'
    markiereZiel(flaecheAusEreignis(tafel, ereignis, ZIMMER_TAG) ?? zimmerVon(spalte)[0] ?? spalte)
  })
  auf('dragleave', (ereignis) => {
    if (!(ereignis.relatedTarget instanceof Node) || !tafel.contains(ereignis.relatedTarget)) markiereZiel(null)
  })
  auf('drop', (ereignis) => {
    const spalte = flaecheAusEreignis(tafel, ereignis, SPALTE_TAG)
    if (!spalte || gezogen?.tafel !== tafel) return
    ereignis.preventDefault()
    void verschiebe(tafel, gezogen.karte, spalte, flaecheAusEreignis(tafel, ereignis, ZIMMER_TAG))
    beendeZug()
  })
  const perTaste = (ereignis: Event): void => {
    const stand = standVon(tafel)
    const gewaehltes = stand.ziele.get(String((ereignis as CustomEvent<string>).detail))
    if (gewaehltes && stand.ausgewaehlt) {
      void verschiebe(tafel, stand.ausgewaehlt, gewaehltes.spalte, gewaehltes.zimmer)
    }
  }
  tafel.addEventListener(VERSCHIEBEN_EVENT, perTaste)
  abmelden.push(() => tafel.removeEventListener(VERSCHIEBEN_EVENT, perTaste))
  verbindungen.set(tafel, () => abmelden.forEach((fn) => fn()))
}

const anschluss = macheDatenAnschluss<HTMLElement>({ hydriere, verdrahte: verdrahteZiehen })

export const tafelAnmelden = anschluss.connect

export function tafelAbmelden(tafel: HTMLElement): void {
  anschluss.disconnect(tafel)
  verbindungen.get(tafel)?.()
  verbindungen.delete(tafel)
  clearTimeout(staende.get(tafel)?.warteTimer)
  if (gezogen?.tafel === tafel) beendeZug()
}
