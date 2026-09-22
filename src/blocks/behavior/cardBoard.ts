import { css } from 'lit'
import { bindingAttr, capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { fieldRead, recordIndexOf } from '../../softengine/data'
import { selectionRefind, giverIdOf, traitOf, chooseSelection } from './selection'
import { holeDataPreamble, makeDataLink } from './source'
import { EMPTY_TEXT_STANDARD } from './emptyState'
import { reportChainsError, runEvent } from './events'
import { Card } from '../card/Card'

export const COLUMN_TAG = 'ff-kanban-column'
export const ROOM_TAG = 'ff-kanban-room'
export const COLUMN_TITLE_STANDARD = 'Neue Spalte'
export const ROOM_TITLE_STANDARD = 'Neue Unterteilung'
export const ROOM_EMPTY_TEXT = 'frei · hierher ziehen'
export const ROOM_CONTENT_EVENT = 'ff-zimmer-inhalt'
export const MOVE_EVENT = 'ff-kanban-verschieben'

export const CARD_TYPE = Card.type
export const CARD_TAG = Card.tag

export const TARGET_CLASS = 'target'

export const boardAreasStyle = css`
  ::slotted(*) { margin-top: 24px; }
  slot { display: contents; }

  :host([data-ff-target]) .ziel {
    background: var(--se-accent-soft);
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }
`

export interface BoardTarget {
  id: string
  name: string
}

interface BoardControls extends HTMLElement {
  message: string
  busy: boolean
  selectionTitle: string
  currentTarget: string
  targets: BoardTarget[]
}

interface CardsData { row: unknown; record: string; key: string }

interface BoardState {
  cards: Map<string, HTMLElement>
  selected: HTMLElement | null
  targets: Map<string, { column: HTMLElement; room: HTMLElement | null }>
  writes: boolean
  expected: { key: string; target: HTMLElement; arrived: boolean } | null
  waitTimer?: ReturnType<typeof setTimeout>
}

const templates = new WeakMap<HTMLElement, HTMLElement>()
const states = new WeakMap<HTMLElement, BoardState>()
const cardsData = new WeakMap<HTMLElement, CardsData>()
const connections = new WeakMap<HTMLElement, () => void>()
let dragged: { card: HTMLElement; board: HTMLElement } | null = null
let target: HTMLElement | null = null
const DRAGS_ATTR = 'data-ff-dragging'
const TARGET_ATTR = 'data-ff-target'

function slotWithValue(value: string, values: readonly string[]): number {
  const wanted = value.trim().toLowerCase()
  if (wanted !== '') {
    for (let i = 0; i < values.length; i++) {
      const candidate = values[i].trim().toLowerCase()
      if (candidate !== '' && candidate === wanted) return i
    }
  }
  return -1
}

function catchAllSlot(flag: readonly (string | null | undefined)[]): number {
  return flag.findIndex((s) => (s ?? '').trim() === 'ja')
}

function childrenWithTag(el: HTMLElement, tag: string): HTMLElement[] {
  return Array.from(el.children).filter(
    (kind): kind is HTMLElement => kind.tagName.toLowerCase() === tag,
  )
}

function columnsOf(board: HTMLElement): HTMLElement[] {
  return childrenWithTag(board, COLUMN_TAG)
}

function roomOf(column: HTMLElement): HTMLElement[] {
  return childrenWithTag(column, ROOM_TAG)
}

function cardsOf(area: HTMLElement): HTMLElement[] {
  return childrenWithTag(area, CARD_TAG)
}

function setEmptyHints(board: HTMLElement, columns: readonly HTMLElement[]): void {
  const record = board.getAttribute('emptytext') ?? EMPTY_TEXT_STANDARD
  const set = (el: HTMLElement, text: string): void => {
    (el as unknown as { emptyHint: string }).emptyHint = text
  }
  for (const column of columns) {
    const room = roomOf(column)
    for (const z of room) set(z, cardsOf(z).length === 0 ? ROOM_EMPTY_TEXT : '')
    set(column, room.length === 0 && cardsOf(column).length === 0 ? record : '')
  }
}

function mappingValue(el: HTMLElement, standardTitle: string): string {
  const value = (el.getAttribute('value') ?? '').trim()
  if (value !== '') return value
  return el.getAttribute('heading') ?? standardTitle
}

function targetRoom(column: HTMLElement, row: unknown): HTMLElement | null {
  const room = roomOf(column)
  if (room.length === 0) return null
  const field = column.getAttribute('groupingfield') ?? ''
  if (field === '') return room[0]

  const values = room.map((z) => mappingValue(z, ROOM_TITLE_STANDARD))
  const slot = slotWithValue(fieldRead(row, field), values)
  return slot >= 0 ? room[slot] : room[0]
}

function stateOf(board: HTMLElement): BoardState {
  let state = states.get(board)
  if (!state) {
    state = { cards: new Map(), selected: null, targets: new Map(), writes: false, expected: null }
    states.set(board, state)
  }
  return state
}

function controls(board: HTMLElement): BoardControls {
  return board as BoardControls
}

function titleOf(card: HTMLElement, withoutTitle: string): string {
  return String((card as Card).heading || withoutTitle)
}

function markTarget(next: HTMLElement | null): void {
  if (target === next) return
  target?.removeAttribute(TARGET_ATTR)
  target = next
  target?.setAttribute(TARGET_ATTR, '')
}

function finishDrag(): void {
  dragged?.card.removeAttribute(DRAGS_ATTR)
  dragged = null
  markTarget(null)
}

function showWriteState(board: HTMLElement, writes: boolean): void {
  const state = stateOf(board)
  state.writes = writes
  controls(board).busy = writes
  board.setAttribute('aria-busy', String(writes))
  for (const card of state.cards.values()) {
    card.draggable = !writes && (cardsData.get(card)?.record ?? '') !== ''
  }
}

function refreshControls(board: HTMLElement): void {
  const state = stateOf(board)
  const card = state.selected
  controls(board).selectionTitle = card ? titleOf(card, 'Gewählte Karte') : ''
  controls(board).currentTarget = card
    ? [...state.targets].find(([, z]) => (z.room ?? z.column) === card.parentElement)?.[0] ?? '' : ''
}

function templateOf(board: HTMLElement): HTMLElement | undefined {
  let template = templates.get(board)
  if (template) return template
  const source = board.querySelector<HTMLTemplateElement>('template[data-ff-template]')
    ?.content.firstElementChild
  if (!source) return undefined
  template = source.cloneNode(true) as HTMLElement
  templates.set(board, template)
  return template
}

function collectTargets(board: HTMLElement, columns: readonly HTMLElement[]): BoardState['targets'] {
  const targets = new Map<string, { column: HTMLElement; room: HTMLElement | null }>()
  const list: BoardTarget[] = []
  columns.forEach((column, si) => {
    const rooms = roomOf(column)
    for (const [zi, room] of (rooms.length > 0 ? rooms : [null]).entries()) {
      const id = `${si}:${zi}`
      targets.set(id, { column, room: room })
      const name = column.getAttribute('heading') ?? COLUMN_TITLE_STANDARD
      list.push({ id, name: room ? `${name} / ${room.getAttribute('heading') ?? 'Unterteilung'}` : name })
    }
  })
  controls(board).targets = list
  return targets
}

function hydrate(board: HTMLElement, delivery: boolean): void {
  const state = stateOf(board)
  const preamble = holeDataPreamble(board)
  const columns = columnsOf(board)
  if (!preamble || columns.length === 0) return
  const template = templateOf(board)
  if (!template) return

  state.targets = collectTargets(board, columns)

  const columnsField = board.getAttribute('columnsfield') ?? ''
  const values = columns.map((s) => mappingValue(s, COLUMN_TITLE_STANDARD))
  const catchAll = catchAllSlot(columns.map((s) => s.getAttribute('catchall')))
  const spots = capability(blockType(Card.type), 'bindable')?.spots ?? []
  if (delivery && state.expected) state.expected.arrived = false
  const next = new Map<string, HTMLElement>()
  const order = new Map<HTMLElement, HTMLElement[]>()
  const occurrences = new Map<string, number>()
  const recordCount = new Map<string, number>()
  for (const row of preamble.rows) {
    const record = recordIndexOf(preamble.source, row)
    if (record !== '') recordCount.set(record, (recordCount.get(record) ?? 0) + 1)
  }
  for (const row of preamble.rows) {
    const record = recordIndexOf(preamble.source, row)
    const unique = record !== '' && recordCount.get(record) === 1
    const base = JSON.stringify([preamble.source.id, unique ? 'record' : 'content', unique ? record : traitOf(row)])
    const number = occurrences.get(base) ?? 0
    occurrences.set(base, number + 1)
    const key = `${base}:${number}`
    const card = state.cards.get(key) ?? template.cloneNode(true) as HTMLElement
    next.set(key, card)
    cardsData.set(card, { row, record: unique ? record : '', key })
    card.draggable = !state.writes && unique
    card.tabIndex = 0
    card.setAttribute('role', 'button')
    for (const spot of spots) {
      const field = card.getAttribute(bindingAttr(spot.prop)) ?? ''
      if (field !== '') (card as unknown as Record<string, unknown>)[spot.prop] = preamble.read(row, field)
    }
    const title = titleOf(card, 'Karte')
    card.setAttribute('aria-label', unique ? title : `${title} – keine eindeutige Satznummer, Verschieben nicht möglich`)
    const slot = columnsField === '' ? -1 : slotWithValue(fieldRead(row, columnsField), values)
    const column = columns[slot >= 0 ? slot : catchAll >= 0 ? catchAll : 0]
    const store = targetRoom(column, row) ?? column
    const list = order.get(store) ?? []
    list.push(card)
    order.set(store, list)
    if (delivery && state.expected?.key === key && state.expected.target === store) {
      const columnFits = columnsField !== '' && slotWithValue(fieldRead(row, columnsField),
        [mappingValue(column, COLUMN_TITLE_STANDARD)]) === 0
      const roomField = column.getAttribute('groupingfield') ?? ''
      const roomFits = store === column || (roomField !== '' && slotWithValue(fieldRead(row, roomField),
        [mappingValue(store, ROOM_TITLE_STANDARD)]) === 0)
      state.expected.arrived = columnFits && roomFits
    }
  }
  for (const [key, card] of state.cards) {
    if (next.has(key)) continue
    if (dragged?.card === card) finishDrag()
    card.remove()
  }
  state.cards = next
  for (const [store, cards] of order) {
    let anchor: Element | null = cardsOf(store)[0] ?? null
    for (const card of cards) {
      if (card === anchor) anchor = anchor.nextElementSibling
      else {
        if (dragged?.card === card) finishDrag()
        store.insertBefore(card, anchor)
      }
    }
  }
  setEmptyHints(board, columns)
  const cards = [...next.values()]
  const hit = new Set(selectionRefind(giverIdOf(board), cards,
    (card) => cardsData.get(card)?.row, (card) => cardsData.get(card)?.key ?? ''))
  cards.forEach((card, i) => {
    card.toggleAttribute('data-ff-selection', hit.has(i))
    card.setAttribute('aria-pressed', String(hit.has(i)))
  })
  state.selected = cards.find((_, i) => hit.has(i)) ?? null
  refreshControls(board)
  if (state.expected?.arrived && !state.writes) confirmed(board)
}

function confirmed(board: HTMLElement): void {
  const state = stateOf(board)
  clearTimeout(state.waitTimer)
  state.expected = null
  controls(board).message = 'Verschiebung in den geladenen Daten bestätigt.'
}

function areaFromEreignis(board: HTMLElement, ereignis: Event, tag: string): HTMLElement | null {
  for (const el of ereignis.composedPath()) {
    if (el instanceof HTMLElement && el.tagName.toLowerCase() === tag && board.contains(el)) return el
  }
  return null
}

function cardFromEreignis(board: HTMLElement, ereignis: Event): HTMLElement | null {
  const card = areaFromEreignis(board, ereignis, CARD_TAG)
  return card && cardsData.has(card) ? card : null
}

async function move(
  board: HTMLElement,
  card: HTMLElement,
  column: HTMLElement,
  room: HTMLElement | null,
): Promise<void> {
  const state = stateOf(board)
  if (state.writes) {
    controls(board).message = 'Eine Verschiebung wird bereits gesendet. Bitte kurz warten.'
    return
  }
  const data = cardsData.get(card)
  if (!data || data.record === '') {
    controls(board).message = 'Diese Karte hat keine eindeutige Satznummer. Prüfe die Datenquelle im Editor.'
    return
  }
  const store = room ?? roomOf(column)[0] ?? column
  if (card.parentElement === store) return
  clearTimeout(state.waitTimer)
  state.expected = { key: data.key, target: store, arrived: false }
  showWriteState(board, true)
  controls(board).message = 'Verschiebung wird gesendet …'
  try {
    const result = await runEvent(board, 'onCardDrop', {
      PINDEX: data.record,
      VALUE: mappingValue(column, COLUMN_TITLE_STANDARD),
      ZIMMER: store === column ? '' : mappingValue(store, ROOM_TITLE_STANDARD),
    })
    if (result.cancelled) {
      state.expected = null
      controls(board).message = 'Die Aktion ist fehlgeschlagen. Die Karte zeigt den zuletzt geladenen Stand.'
    } else if (!result.ran) {
      state.expected = null
      controls(board).message = result.busy
        ? 'Die Aktion läuft bereits.' : 'Für „Karte verschoben“ ist noch keine Aktion eingerichtet.'
    } else if (!result.written) {
      state.expected = null
      controls(board).message = 'Aktion ausgeführt. Sie hat keine Daten geschrieben.'
    } else if (state.expected?.arrived) {
      confirmed(board)
    } else {
      controls(board).message = 'Gesendet. Die Karte wechselt ihren Platz, sobald neue Daten die Änderung bestätigen.'
      state.waitTimer = setTimeout(() => {
        if (state.expected) controls(board).message = 'Die Verschiebung ist noch nicht durch neue Daten bestätigt. Angezeigt wird der zuletzt geladene Stand.'
      }, 20000)
    }
  } catch (error) {
    state.expected = null
    controls(board).message = 'Verschiebung fehlgeschlagen. Bitte die Fehlermeldung beachten.'
    reportChainsError(error)
  } finally {
    showWriteState(board, false)
  }
}

function wireDrag(board: HTMLElement): void {
  if (connections.has(board)) return
  const unregister: (() => void)[] = []
  const on = <K extends keyof HTMLElementEventMap>(name: K, fn: (e: HTMLElementEventMap[K]) => void): void => {
    board.addEventListener(name, fn)
    unregister.push(() => board.removeEventListener(name, fn))
  }
  const choose = (card: HTMLElement): void => {
    const data = cardsData.get(card)
    if (!data) return
    chooseSelection(giverIdOf(board), data.row, data.key)
    runEvent(board, 'onCardClick', { PINDEX: data.record }).catch(reportChainsError)
  }
  on('click', (ereignis) => {
    const card = cardFromEreignis(board, ereignis)
    if (card) choose(card)
  })
  on('keydown', (ereignis) => {
    if (ereignis.key !== 'Enter' && ereignis.key !== ' ') return
    const card = cardFromEreignis(board, ereignis)
    if (!card || ereignis.target !== card) return
    ereignis.preventDefault()
    choose(card)
  })
  on('dragstart', (ereignis) => {
    const card = cardFromEreignis(board, ereignis)
    if (!card) return
    if (stateOf(board).writes || !card.draggable) { ereignis.preventDefault(); return }
    dragged = { card, board }
    ereignis.dataTransfer?.setData('text/plain', cardsData.get(card)?.record ?? '')
    if (ereignis.dataTransfer) ereignis.dataTransfer.effectAllowed = 'move'
    setTimeout(() => { if (dragged?.card === card) card.setAttribute(DRAGS_ATTR, '') }, 0)
  })
  on('dragend', finishDrag)
  on('dragover', (ereignis) => {
    const column = areaFromEreignis(board, ereignis, COLUMN_TAG)
    if (dragged?.board !== board || !column || stateOf(board).writes) return
    ereignis.preventDefault()
    if (ereignis.dataTransfer) ereignis.dataTransfer.dropEffect = 'move'
    markTarget(areaFromEreignis(board, ereignis, ROOM_TAG) ?? roomOf(column)[0] ?? column)
  })
  on('dragleave', (ereignis) => {
    if (!(ereignis.relatedTarget instanceof Node) || !board.contains(ereignis.relatedTarget)) markTarget(null)
  })
  on('drop', (ereignis) => {
    const column = areaFromEreignis(board, ereignis, COLUMN_TAG)
    if (!column || dragged?.board !== board) return
    ereignis.preventDefault()
    void move(board, dragged.card, column, areaFromEreignis(board, ereignis, ROOM_TAG))
    finishDrag()
  })
  const perKey = (ereignis: Event): void => {
    const state = stateOf(board)
    const chosen = state.targets.get(String((ereignis as CustomEvent<string>).detail))
    if (chosen && state.selected) {
      void move(board, state.selected, chosen.column, chosen.room)
    }
  }
  board.addEventListener(MOVE_EVENT, perKey)
  unregister.push(() => board.removeEventListener(MOVE_EVENT, perKey))
  connections.set(board, () => unregister.forEach((fn) => fn()))
}

const link = makeDataLink<HTMLElement>({ hydrate, wire: wireDrag })

export const boardRegister = link.connect

export function boardUnregister(board: HTMLElement): void {
  link.disconnect(board)
  connections.get(board)?.()
  connections.delete(board)
  clearTimeout(states.get(board)?.waitTimer)
  if (dragged?.board === board) finishDrag()
}
