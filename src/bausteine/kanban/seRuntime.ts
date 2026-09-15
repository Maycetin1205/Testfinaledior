// Die Tafel am SoftEngine-Datenstrom: Karten einsortieren und das Ziehen verdrahten.
import { bindungsAttr, faehigkeit } from '../../kern/maske/faehigkeiten'
import { alleBausteinArten } from '../../kern/maske/registry'
import { getField, satzIndexVon } from '../../softengine/data'
import { auswahlWiederfinden, geberIdVon, merkmalVon, waehleAuswahl } from '../shared/auswahl'
import { macheDatenAnschluss } from '../shared/datenAnschluss'
import { holeDatenVorspann } from '../shared/datenVorspann'
import { LEER_TEXT_STANDARD } from '../shared/leerZustand'
import { meldeKettenFehler, runEvent } from '../shared/seAktionen'
import { CardBlock } from '../card/CardBlock'
import { KanbanSpalteBlock } from './KanbanSpalteBlock'
import { KanbanZimmerBlock, ZIMMER_LEER_TEXT } from './KanbanZimmerBlock'

function columnIndexFor(value: string, columnValues: readonly string[]): number {
  const v = value.trim().toLowerCase()
  if (v !== '') {
    for (let i = 0; i < columnValues.length; i++) {
      const cv = columnValues[i].trim().toLowerCase()
      if (cv !== '' && cv === v) return i
    }
  }
  return -1
}

function catchColumnIndex(flags: readonly (string | null | undefined)[]): number {
  return flags.findIndex((flag) => (flag ?? '').trim() === 'ja')
}

const templates = new WeakMap<HTMLElement, HTMLElement>()

const SPALTE_TAG = KanbanSpalteBlock.tagName
const ZIMMER_TAG = KanbanZimmerBlock.tagName
const CARD_TAG = CardBlock.tagName

function columnsOf(board: HTMLElement): HTMLElement[] {
  return Array.from(board.children).filter(
    (el): el is HTMLElement => el.tagName.toLowerCase() === SPALTE_TAG,
  )
}

function cardsOf(flaeche: HTMLElement): HTMLElement[] {
  return Array.from(flaeche.children).filter(
    (el): el is HTMLElement => el.tagName.toLowerCase() === CARD_TAG,
  )
}

function zimmerOf(column: HTMLElement): HTMLElement[] {
  return Array.from(column.children).filter(
    (el): el is HTMLElement => el.tagName.toLowerCase() === ZIMMER_TAG,
  )
}


function setzeLeerHinweise(board: HTMLElement, columns: readonly HTMLElement[]): void {
  const satz = board.getAttribute('leertext') ?? LEER_TEXT_STANDARD
  const setze = (el: HTMLElement, text: string): void => {
    (el as unknown as { leerHinweis: string }).leerHinweis = text
  }
  for (const col of columns) {
    const zimmer = zimmerOf(col)
    for (const z of zimmer) setze(z, cardsOf(z).length === 0 ? ZIMMER_LEER_TEXT : '')
    setze(col, zimmer.length === 0 && cardsOf(col).length === 0 ? satz : '')
  }
}

function spotsForTag(tagName: string) {
  const def = alleBausteinArten().find((d) => d.tagName === tagName.toLowerCase())
  return faehigkeit(def, 'bindbar')?.stellen ?? []
}

// Der Wert, den das ERP kennt. Der Titel ist Anzeige: umbenennen darf die
// Zuordnung nicht verstellen. Nur wenn niemand einen Wert gesetzt hat, bleibt
// es beim Titel, sonst ginge nach dem Anlegen einer Spalte gar nichts hinaus.
function zuordnungsWert(el: HTMLElement, standardTitel: string): string {
  const wert = (el.getAttribute('wert') ?? '').trim()
  if (wert !== '') return wert
  return el.getAttribute('heading') ?? standardTitel
}

function zielZimmer(column: HTMLElement, row: unknown): HTMLElement | null {
  const zimmer = zimmerOf(column)
  if (zimmer.length === 0) return null
  const feld = column.getAttribute('zimmerfield') ?? ''
  if (feld === '') return zimmer[0]

  const werte = zimmer.map((z) => zuordnungsWert(z, KanbanZimmerBlock.defaultProps.heading))
  const idx = columnIndexFor(getField(row, feld), werte)
  return idx >= 0 ? zimmer[idx] : zimmer[0]
}

export interface KanbanZiel {
  id: string
  name: string
}

interface KanbanBedienung extends HTMLElement {
  statusText: string
  beschaeftigt: boolean
  auswahlTitel: string
  aktuellesZiel: string
  ziele: KanbanZiel[]
}

interface KartenDaten { row: unknown; pindex: string; schluessel: string }
interface BoardStand {
  karten: Map<string, HTMLElement>
  ausgewaehlt: HTMLElement | null
  ziele: Map<string, { spalte: HTMLElement; zimmer: HTMLElement | null }>
  schreibt: boolean
  erwartet: { schluessel: string; ziel: HTMLElement; angekommen: boolean } | null
  warteTimer?: ReturnType<typeof setTimeout>
}

const staende = new WeakMap<HTMLElement, BoardStand>()
const cardData = new WeakMap<HTMLElement, KartenDaten>()
const verbindungen = new WeakMap<HTMLElement, () => void>()
let dragged: { card: HTMLElement; board: HTMLElement } | null = null
let ziel: HTMLElement | null = null
const ZIEHT_ATTR = 'data-ff-zieht'
const ZIEL_ATTR = 'data-ff-ziel'

function standVon(board: HTMLElement): BoardStand {
  let stand = staende.get(board)
  if (!stand) {
    stand = { karten: new Map(), ausgewaehlt: null, ziele: new Map(), schreibt: false, erwartet: null }
    staende.set(board, stand)
  }
  return stand
}

function bedienung(board: HTMLElement): KanbanBedienung {
  return board as KanbanBedienung
}

function markiereZiel(neu: HTMLElement | null): void {
  if (ziel === neu) return
  ziel?.removeAttribute(ZIEL_ATTR)
  ziel = neu
  ziel?.setAttribute(ZIEL_ATTR, '')
}

function beendeZug(): void {
  dragged?.card.removeAttribute(ZIEHT_ATTR)
  dragged = null
  markiereZiel(null)
}

function zeigeSchreibstand(board: HTMLElement, schreibt: boolean): void {
  const stand = standVon(board)
  stand.schreibt = schreibt
  bedienung(board).beschaeftigt = schreibt
  board.setAttribute('aria-busy', String(schreibt))
  for (const card of stand.karten.values()) {
    card.draggable = !schreibt && (cardData.get(card)?.pindex ?? '') !== ''
  }
}

function aktualisiereBedienung(board: HTMLElement): void {
  const stand = standVon(board)
  const card = stand.ausgewaehlt
  bedienung(board).auswahlTitel = card
    ? String((card as unknown as { heading: string }).heading || 'Gewählte Karte') : ''
  bedienung(board).aktuellesZiel = card
    ? [...stand.ziele].find(([, z]) => (z.zimmer ?? z.spalte) === card.parentElement)?.[0] ?? '' : ''
}

function hydrate(board: HTMLElement, lieferung: boolean): void {
  const stand = standVon(board)
  const vorspann = holeDatenVorspann(board)
  const columns = columnsOf(board)
  if (!vorspann || columns.length === 0) return
  let template = templates.get(board)
  if (!template) {
    const tpl = board.querySelector<HTMLTemplateElement>('template[data-ff-template]')
    const source = tpl?.content.firstElementChild
    if (source) {
      template = source.cloneNode(true) as HTMLElement
      templates.set(board, template)
    }
  }
  if (!template) return

  const ziele = new Map<string, { spalte: HTMLElement; zimmer: HTMLElement | null }>()
  const zielListe: KanbanZiel[] = []
  columns.forEach((spalte, si) => {
    const zimmer = zimmerOf(spalte)
    for (const [zi, raum] of (zimmer.length > 0 ? zimmer : [null]).entries()) {
      const id = `${si}:${zi}`
      ziele.set(id, { spalte, zimmer: raum })
      const name = spalte.getAttribute('heading') ?? KanbanSpalteBlock.defaultProps.heading
      zielListe.push({ id, name: raum ? `${name} / ${raum.getAttribute('heading') ?? 'Zimmer'}` : name })
    }
  })
  stand.ziele = ziele
  bedienung(board).ziele = zielListe

  const statusField = board.getAttribute('statusfield') ?? ''
  const werte = columns.map((c) => zuordnungsWert(c, KanbanSpalteBlock.defaultProps.heading))
  const auffang = catchColumnIndex(columns.map((c) => c.getAttribute('auffang')))
  const spots = spotsForTag(template.tagName)
  if (lieferung && stand.erwartet) stand.erwartet.angekommen = false
  const naechste = new Map<string, HTMLElement>()
  const reihenfolge = new Map<HTMLElement, HTMLElement[]>()
  const vorkommen = new Map<string, number>()
  const satzAnzahl = new Map<string, number>()
  for (const row of vorspann.zeilen) {
    const satz = satzIndexVon(vorspann.quelle, row)
    if (satz !== '') satzAnzahl.set(satz, (satzAnzahl.get(satz) ?? 0) + 1)
  }
  for (const row of vorspann.zeilen) {
    const satz = satzIndexVon(vorspann.quelle, row)
    const eindeutig = satz !== '' && satzAnzahl.get(satz) === 1
    const basis = JSON.stringify([vorspann.quelle.id, eindeutig ? 'satz' : 'inhalt', eindeutig ? satz : merkmalVon(row)])
    const nummer = vorkommen.get(basis) ?? 0
    vorkommen.set(basis, nummer + 1)
    const schluessel = `${basis}:${nummer}`
    const card = stand.karten.get(schluessel) ?? template.cloneNode(true) as HTMLElement
    naechste.set(schluessel, card)
    cardData.set(card, { row, pindex: eindeutig ? satz : '', schluessel })
    card.draggable = !stand.schreibt && eindeutig
    card.tabIndex = 0
    card.setAttribute('role', 'button')
    for (const spot of spots) {
      const feld = card.getAttribute(bindungsAttr(spot.prop)) ?? ''
      if (feld !== '') (card as unknown as Record<string, unknown>)[spot.prop] = vorspann.lies(row, feld)
    }
    const titel = String((card as unknown as { heading: string }).heading || 'Karte')
    card.setAttribute('aria-label', eindeutig ? titel : `${titel} – keine eindeutige Satznummer, Verschieben nicht möglich`)
    const index = statusField === '' ? -1 : columnIndexFor(getField(row, statusField), werte)
    const spalte = columns[index >= 0 ? index : auffang >= 0 ? auffang : 0]
    const ablage = zielZimmer(spalte, row) ?? spalte
    const liste = reihenfolge.get(ablage) ?? []
    liste.push(card)
    reihenfolge.set(ablage, liste)
    if (lieferung && stand.erwartet?.schluessel === schluessel && stand.erwartet.ziel === ablage) {
      const statusPasst = statusField !== '' && columnIndexFor(getField(row, statusField),
        [zuordnungsWert(spalte, KanbanSpalteBlock.defaultProps.heading)]) === 0
      const zimmerFeld = spalte.getAttribute('zimmerfield') ?? ''
      const zimmerPasst = ablage === spalte || (zimmerFeld !== '' && columnIndexFor(getField(row, zimmerFeld),
        [zuordnungsWert(ablage, KanbanZimmerBlock.defaultProps.heading)]) === 0)
      stand.erwartet.angekommen = statusPasst && zimmerPasst
    }
  }
  for (const [schluessel, card] of stand.karten) {
    if (naechste.has(schluessel)) continue
    if (dragged?.card === card) beendeZug()
    card.remove()
  }
  stand.karten = naechste
  for (const [ablage, karten] of reihenfolge) {
    let anker: Element | null = cardsOf(ablage)[0] ?? null
    for (const card of karten) {
      if (card === anker) anker = anker.nextElementSibling
      else {
        if (dragged?.card === card) beendeZug()
        ablage.insertBefore(card, anker)
      }
    }
  }
  setzeLeerHinweise(board, columns)
  const karten = [...naechste.values()]
  const treffer = new Set(auswahlWiederfinden(geberIdVon(board), karten,
    (card) => cardData.get(card)?.row, (card) => cardData.get(card)?.schluessel ?? ''))
  karten.forEach((card, i) => {
    card.toggleAttribute('data-ff-auswahl', treffer.has(i))
    card.setAttribute('aria-pressed', String(treffer.has(i)))
  })
  stand.ausgewaehlt = karten.find((_, i) => treffer.has(i)) ?? null
  aktualisiereBedienung(board)
  if (stand.erwartet?.angekommen && !stand.schreibt) bestaetigt(board)
}

function bestaetigt(board: HTMLElement): void {
  const stand = standVon(board)
  clearTimeout(stand.warteTimer)
  stand.erwartet = null
  bedienung(board).statusText = 'Verschiebung in den geladenen Daten bestätigt.'
}

function flaecheOfEvent(board: HTMLElement, event: Event, tag: string): HTMLElement | null {
  for (const el of event.composedPath()) {
    if (el instanceof HTMLElement && el.tagName.toLowerCase() === tag && board.contains(el)) return el
  }
  return null
}

function karteOfEvent(board: HTMLElement, event: Event): HTMLElement | null {
  const card = flaecheOfEvent(board, event, CARD_TAG)
  return card && cardData.has(card) ? card : null
}

async function verschiebe(board: HTMLElement, card: HTMLElement, spalte: HTMLElement, zimmer: HTMLElement | null): Promise<void> {
  const stand = standVon(board)
  if (stand.schreibt) {
    bedienung(board).statusText = 'Eine Verschiebung wird bereits gesendet. Bitte kurz warten.'
    return
  }
  const data = cardData.get(card)
  if (!data || data.pindex === '') {
    bedienung(board).statusText = 'Diese Karte hat keine eindeutige Satznummer. Prüfe die Datenquelle im Editor.'
    return
  }
  const ablage = zimmer ?? zimmerOf(spalte)[0] ?? spalte
  if (card.parentElement === ablage) return
  clearTimeout(stand.warteTimer)
  stand.erwartet = { schluessel: data.schluessel, ziel: ablage, angekommen: false }
  zeigeSchreibstand(board, true)
  bedienung(board).statusText = 'Verschiebung wird gesendet …'
  try {
    const ergebnis = await runEvent(board, 'onCardDrop', {
      PINDEX: data.pindex,
      VALUE: zuordnungsWert(spalte, KanbanSpalteBlock.defaultProps.heading),
      ZIMMER: ablage === spalte ? '' : zuordnungsWert(ablage, KanbanZimmerBlock.defaultProps.heading),
    })
    if (ergebnis.abgebrochen) {
      stand.erwartet = null
      bedienung(board).statusText = 'Die Aktion ist fehlgeschlagen. Die Karte zeigt den zuletzt geladenen Stand.'
    } else if (!ergebnis.ausgefuehrt) {
      stand.erwartet = null
      bedienung(board).statusText = ergebnis.beschaeftigt
        ? 'Die Aktion läuft bereits.' : 'Für „Karte verschoben“ ist noch keine Aktion eingerichtet.'
    } else if (!ergebnis.geschrieben) {
      stand.erwartet = null
      bedienung(board).statusText = 'Aktion ausgeführt. Sie hat keine Daten geschrieben.'
    } else if (stand.erwartet?.angekommen) {
      bestaetigt(board)
    } else {
      bedienung(board).statusText = 'Gesendet. Die Karte wechselt ihren Platz, sobald neue Daten die Änderung bestätigen.'
      stand.warteTimer = setTimeout(() => {
        if (stand.erwartet) bedienung(board).statusText = 'Die Verschiebung ist noch nicht durch neue Daten bestätigt. Angezeigt wird der zuletzt geladene Stand.'
      }, 20000)
    }
  } catch (fehler) {
    stand.erwartet = null
    bedienung(board).statusText = 'Verschiebung fehlgeschlagen. Bitte die Fehlermeldung beachten.'
    meldeKettenFehler(fehler)
  } finally {
    zeigeSchreibstand(board, false)
  }
}

function wireDrag(board: HTMLElement): void {
  if (verbindungen.has(board)) return
  const abmelden: (() => void)[] = []
  const auf = <K extends keyof HTMLElementEventMap>(name: K, fn: (event: HTMLElementEventMap[K]) => void): void => {
    board.addEventListener(name, fn)
    abmelden.push(() => board.removeEventListener(name, fn))
  }
  const waehle = (card: HTMLElement): void => {
    const data = cardData.get(card)
    if (!data) return
    waehleAuswahl(geberIdVon(board), data.row, data.schluessel)
    runEvent(board, 'onCardClick', { PINDEX: data.pindex }).catch(meldeKettenFehler)
  }
  auf('click', (event) => {
    const card = karteOfEvent(board, event)
    if (card) waehle(card)
  })
  auf('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const card = karteOfEvent(board, event)
    if (!card || event.target !== card) return
    event.preventDefault()
    waehle(card)
  })
  auf('dragstart', (event) => {
    const card = karteOfEvent(board, event)
    if (!card) return
    if (standVon(board).schreibt || !card.draggable) { event.preventDefault(); return }
    dragged = { card, board }
    event.dataTransfer?.setData('text/plain', cardData.get(card)?.pindex ?? '')
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    setTimeout(() => { if (dragged?.card === card) card.setAttribute(ZIEHT_ATTR, '') }, 0)
  })
  auf('dragend', beendeZug)
  auf('dragover', (event) => {
    const spalte = flaecheOfEvent(board, event, SPALTE_TAG)
    if (dragged?.board !== board || !spalte || standVon(board).schreibt) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    markiereZiel(flaecheOfEvent(board, event, ZIMMER_TAG) ?? zimmerOf(spalte)[0] ?? spalte)
  })
  auf('dragleave', (event) => {
    if (!(event.relatedTarget instanceof Node) || !board.contains(event.relatedTarget)) markiereZiel(null)
  })
  auf('drop', (event) => {
    const spalte = flaecheOfEvent(board, event, SPALTE_TAG)
    if (!spalte || dragged?.board !== board) return
    event.preventDefault()
    void verschiebe(board, dragged.card, spalte, flaecheOfEvent(board, event, ZIMMER_TAG))
    beendeZug()
  })
  const perTaste = (event: Event): void => {
    const stand = standVon(board)
    const ziel = stand.ziele.get(String((event as CustomEvent<string>).detail))
    if (ziel && stand.ausgewaehlt) void verschiebe(board, stand.ausgewaehlt, ziel.spalte, ziel.zimmer)
  }
  board.addEventListener('ff-kanban-verschieben', perTaste)
  abmelden.push(() => board.removeEventListener('ff-kanban-verschieben', perTaste))
  verbindungen.set(board, () => abmelden.forEach((fn) => fn()))
}

const anschluss = macheDatenAnschluss<HTMLElement>({ hydriere: hydrate, verdrahte: wireDrag })
export const connectBoard = anschluss.connect
export function disconnectBoard(board: HTMLElement): void {
  anschluss.disconnect(board)
  verbindungen.get(board)?.()
  verbindungen.delete(board)
  clearTimeout(staende.get(board)?.warteTimer)
  if (dragged?.board === board) beendeZug()
}
