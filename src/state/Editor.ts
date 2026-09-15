// Der Editor-Zustand: Baustein-Baum, Auswahl, Historie, Bibliotheken.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../core/blocks/BlockData'
import { neuerTeilbaum } from '../core/blocks/blockFactory'
import { darfEnthalten, bausteinArt } from '../core/blocks/blockRegistry'
import { rasterMassVon } from '../core/blocks/rasterLayout'
import { type Ketten } from '../core/data/aktionen'
import { type Datenquelle } from '../core/data/dataSources'
import { type QuelleInReichweite } from '../core/data/sourceLinks'
import { DataSourceStore } from './DataSourceStore'
import { ersteQuelleInReichweite, quellenInReichweite } from './quellenOps'
import { gestenKlammer, Historie, type EditorSnapshot, type GestenKlammer } from './history'
import type { MaskenInhalt } from './maskenDatei'
import { meldungen } from './meldungen'
import { loadFromStorage, persistState, SAVE_DEBOUNCE_MS } from './persistence'
import { RelationStore } from './RelationStore'
import { gestricheneKennungen, ohneSpaltenZeiger } from './spaltenAufraeumen'
import { SpeicherPlaner } from './speicherPlaner'
import { Subject } from './Subject'
import { dupliziereTeilbaum } from './duplizieren'
import { teilbaumIds, leererBaum } from './treeOps'
import {
  isRemoveProtected as istMusterGeschuetzt,
  templateMarkFor as templateMarkInTree,
} from './templateRules'
import {
  aktiveSeitenWurzel,
  freierSeitenName,
  kinderImFluss,
  klarnamenNachziehen,
  schreibWert,
  seitenDerMaske,
  type SeitenEintrag,
} from './pageOps'
import {
  freieZeileAuf,
  istRasterFlaeche,
  neuerBlockAnZelle,
  verschiebeInContainer,
  zelleneinzug,
  zellenGroesse,
} from './rasterOps'
import { auswahlAufSeite, auswahlZiel } from './selectionOps'
import { deepClone } from '../lib/deepClone'

export class Editor extends Subject<Editor> {
  readonly datenquellen: DataSourceStore
  readonly relationen: RelationStore

  private _tree: Maskenbaum = leererBaum()
  private _selectedId: string | null = null

  private _activePageId: string = WURZEL_ID
  private _version = 0
  private _historie = new Historie()

  private _planer = new SpeicherPlaner(
    () => persistState(this._tree, this._selectedId, {
      datenquellen: this.datenquellen.list,
      relationen: this.relationen.list,
      activePageId: this.activePageId,
    }),
    SAVE_DEBOUNCE_MS,
  )
  private _hydrated = false

  // Waehrend Undo/Redo darf die Aenderung der Bibliotheken keinen neuen
  // Historien-Eintrag erzeugen.
  private _stelltWiederHer = false

  constructor(inhalt?: MaskenInhalt) {
    super()
    const persisted = inhalt ? null : loadFromStorage()
    this.datenquellen = new DataSourceStore(inhalt?.datenquellen ?? persisted?.datenquellen)
    this.relationen = new RelationStore(inhalt?.relationen ?? persisted?.relationen)
    this._tree = inhalt?.tree ?? persisted?.tree ?? leererBaum()
    this._activePageId = persisted?.activePageId ?? WURZEL_ID
    this._selectedId = this.auswahlAufAktiverSeite(persisted?.selectedId ?? null)
    this._hydrated = true

    // Die Bibliotheken gehoeren zur Maske: jede Aenderung daran wird hier
    // festgehalten, damit Strg+Z sie zuruecknimmt.
    for (const store of [this.datenquellen, this.relationen]) {
      store.beobachteVorAenderung(() => {
        if (!this._stelltWiederHer) this.pushHistory()
      })
      store.subscribe(() => {
        if (!this._stelltWiederHer) this.notify(this)
      })
    }
  }

  get tree(): Readonly<Maskenbaum> { return this._tree }

  get rootId(): string {
    return aktiveSeitenWurzel(this._tree, this._activePageId)
  }

  get activePageId(): string { return this.rootId }

  get pages(): SeitenEintrag[] {
    return seitenDerMaske(this._tree)
  }

  private auswahlAufAktiverSeite(id: string | null): string | null {
    return auswahlAufSeite(this._tree, id, this.rootId)
  }

  setActivePage(id: string): void {
    const next = aktiveSeitenWurzel(this._tree, id)
    if (next === this._activePageId) return
    this._activePageId = next
    this._selectedId = null
    this.notify(this)
  }

  addSeite(typ: string): Baustein | null {
    const def = bausteinArt(typ)
    if (def?.pageBlock !== true) return null
    const name = freierSeitenName(this.pages.map((p) => p.name), def.displayName)
    return this.transaktion(() => {
      const node = this.addBlock(typ, WURZEL_ID)
      if (node) {
        this._activePageId = node.id
        this.updateProperty(node.id, 'name', name)
      }
      return node
    })
  }

  getNode(id: string): Baustein | undefined { return this._tree[id] }

  childNodesOf(parentId: string): Baustein[] {
    return kinderImFluss(this._tree, parentId)
  }

  get blockCount(): number { return Object.keys(this._tree).length - 1 }

  get selectedId(): string | null { return this._selectedId }
  get selectedNode(): Baustein | null {
    if (this._selectedId === null) return null
    const node = this._tree[this._selectedId]
    return node && node.id !== WURZEL_ID ? node : null
  }

  get version(): number { return this._version }
  get canUndo(): boolean { return this._historie.canUndo }
  get canRedo(): boolean { return this._historie.canRedo }

  override notify(data: Editor): void {
    this._version++
    try {
      super.notify(data)
    } finally {
      if (this._hydrated) this._planer.plane()
    }
  }

  private snapshot(): EditorSnapshot {
    return {
      tree: deepClone(this._tree),
      selectedId: this._selectedId,
      activePageId: this.activePageId,
      datenquellen: this.datenquellen.list,
      relationen: this.relationen.list,
    }
  }

  private setzeBibliotheken(stand: Pick<EditorSnapshot, 'datenquellen' | 'relationen'>): void {
    this._stelltWiederHer = true
    try {
      if (this.datenquellen.list !== stand.datenquellen) this.datenquellen.ersetzeAlle(stand.datenquellen)
      if (this.relationen.list !== stand.relationen) this.relationen.ersetzeAlle(stand.relationen)
    } finally {
      this._stelltWiederHer = false
    }
  }

  private pushHistory(): void {
    this._historie.record(() => this.snapshot())
  }

  beginTransaction(): void {
    this._historie.begin(() => this.snapshot())
  }

  endTransaction(): void {
    this._historie.end()
  }

  transaktion<T>(tun: () => T): T {
    return this._historie.transaktion(() => this.snapshot(), tun)
  }

  oeffneGeste(): GestenKlammer {
    return gestenKlammer(() => this.beginTransaction(), () => this.endTransaction())
  }

  undo(): void {
    const prev = this._historie.undo(() => this.snapshot())
    if (!prev) return
    this.stelleHer(prev)
  }

  redo(): void {
    const next = this._historie.redo(() => this.snapshot())
    if (!next) return
    this.stelleHer(next)
  }

  private stelleHer(stand: EditorSnapshot): void {
    this.setzeBibliotheken(stand)
    this._tree = stand.tree
    this._activePageId = stand.activePageId ?? WURZEL_ID
    this._selectedId = this.auswahlAufAktiverSeite(stand.selectedId)
    this.notify(this)
  }

  addBlock(type: string, parentId?: string, index?: number): Baustein | null {
    const parent = this._tree[parentId ?? this.rootId]
    if (!parent || !darfEnthalten(parent.type, type)) return null
    this.pushHistory()
    const { nodes, rootId } = neuerTeilbaum(type)
    const node = nodes[rootId]
    node.parentId = parent.id

    if (istRasterFlaeche(parent)) {
      const spec = rasterMassVon(bausteinArt(type))
      const y = freieZeileAuf(this._tree, parent.id)
      node.props = { ...node.props, rasterX: 0, rasterY: y, rasterW: spec.startW, rasterH: spec.startH }
    }
    const childIds = [...parent.childIds]
    const at = index === undefined
      ? childIds.length
      : Math.max(0, Math.min(index, childIds.length))
    childIds.splice(at, 0, node.id)
    this._tree = {
      ...this._tree,
      ...nodes,
      [parent.id]: { ...parent, childIds },
    }
    this._selectedId = node.id
    this.notify(this)
    return node
  }

  isInSubtree(ancestorId: string, id: string): boolean {
    let cur: string | null | undefined = id
    while (cur) {
      if (cur === ancestorId) return true
      cur = this._tree[cur]?.parentId
    }
    return false
  }

  removeBlock(id: string): void {
    const node = this._tree[id]
    if (!node || id === WURZEL_ID) return

    if (this.isRemoveProtected(id)) return
    this.pushHistory()
    const remove = new Set(teilbaumIds(this._tree, id))
    const next: Maskenbaum = {}
    for (const [key, value] of Object.entries(this._tree)) {
      if (!remove.has(key)) next[key] = value
    }
    if (node.parentId && next[node.parentId]) {
      const parent = next[node.parentId]
      next[node.parentId] = { ...parent, childIds: parent.childIds.filter((c) => c !== id) }
    }
    this._tree = next
    if (this._selectedId && remove.has(this._selectedId)) this._selectedId = null
    this.notify(this)
  }

  selectBlock(id: string | null): void {
    if (this._selectedId === id) return
    this._selectedId = id
    this.notify(this)
  }

  waehleGetroffenen(getroffenId: string): void {
    const ziel = auswahlZiel(this._tree, getroffenId)
    if (ziel !== null) this.selectBlock(ziel)
  }

  dataSourceFor(id: string): Datenquelle | undefined {
    return ersteQuelleInReichweite(this._tree, id, this.datenquellen.list)
  }

  quellenFor(id: string): QuelleInReichweite[] {
    return quellenInReichweite(this._tree, id, this.datenquellen.list)
  }

  templateMarkFor(id: string): string | undefined {
    return templateMarkInTree(this._tree, id)
  }

  isRemoveProtected(id: string): boolean {
    return istMusterGeschuetzt(this._tree, id)
  }

  // Liefert false, wenn der Wert VERWORFEN wurde; der Baustein stellt dann seinen
  // alten Text wieder her.
  updateProperty(id: string, attr: string, value: unknown): boolean {
    const node = this._tree[id]
    if (!node) return false
    const def = bausteinArt(node.type)

    const wert = schreibWert(def, this.pages, id, attr, value)
    if (wert === null) return false

    if (Object.is(node.props[attr], wert)) return true
    this.pushHistory()
    const next: Maskenbaum = {
      ...this._tree,
      [id]: { ...node, props: { ...node.props, [attr]: wert } },
    }

    const prop = def?.customProperties.find((p) => p.attributeName === attr)
    if (prop?.exclusiveAmongSiblings && wert === 'ja' && node.parentId) {
      for (const sibId of this._tree[node.parentId]?.childIds ?? []) {
        const sib = next[sibId]
        if (sibId !== id && sib?.type === node.type && sib.props[attr] === 'ja') {
          next[sibId] = { ...sib, props: { ...sib.props, [attr]: 'nein' } }
        }
      }
    }

    // Verschwindet eine Kennung aus einer Liste, darf kein Ketten-Parameter mehr
    // auf sie zeigen; die Ketten koennen auf anderen Bausteinen liegen.
    const geputzt = ohneSpaltenZeiger(
      next,
      id,
      gestricheneKennungen(def, attr, node.props[attr], wert),
    )
    if (geputzt.parameter > 0) {
      meldungen.melde(
        `Spalte gelöscht: ${geputzt.parameter} Ketten-Parameter auf `
        + `${geputzt.bausteine} Baustein(en) zeigten darauf und sind jetzt ausgeschaltet. `
        + 'Strg+Z holt alles zurück.',
      )
    }

    this._tree = typeof wert === 'string' && def?.pageBlock === true && attr === 'name'
      ? klarnamenNachziehen(geputzt.tree, id, wert)
      : geputzt.tree
    this.notify(this)
    return true
  }

  updateBlockEvents(id: string, events: Ketten): void {
    const node = this._tree[id]
    if (!node || id === WURZEL_ID) return
    this.pushHistory()
    const clean: Ketten = {}
    for (const [key, steps] of Object.entries(events)) {
      if (steps.length > 0) clean[key] = steps
    }
    const next: Baustein = { ...node }
    if (Object.keys(clean).length > 0) next.events = clean
    else delete next.events
    this._tree = { ...this._tree, [id]: next }
    this.notify(this)
  }

  duplicateBlock(id: string): Baustein | null {
    if (this.isRemoveProtected(id)) return null
    const res = dupliziereTeilbaum(this._tree, id)
    if (!res) return null
    this.pushHistory()
    this._tree = res.tree
    this._selectedId = res.kopieId
    this.notify(this)
    return res.tree[res.kopieId]
  }

  moveNode(id: string, newParentId: string, index: number): void {
    if (this.isRemoveProtected(id)) return
    const next = verschiebeInContainer(this._tree, id, newParentId, index)
    if (!next) return
    this.pushHistory()
    this._tree = next
    this.notify(this)
  }

  moveNodeToCell(id: string, parentId: string, x: number, y: number): void {
    const next = zelleneinzug(this._tree, id, parentId, x, y)
    if (!next) return
    this.pushHistory()
    this._tree = next
    this._selectedId = id
    this.notify(this)
  }

  resizeNodeToCells(id: string, achse: 'x' | 'y', value: number): void {
    const next = zellenGroesse(this._tree, id, achse, value)
    if (!next) return
    this.pushHistory()
    this._tree = next
    this.notify(this)
  }

  addBlockAtCell(type: string, parentId: string, x: number, y: number): Baustein | null {
    const res = neuerBlockAnZelle(this._tree, type, parentId, x, y)
    if (!res) return null
    this.pushHistory()
    this._tree = res.tree
    this._selectedId = res.node.id
    this.notify(this)
    return res.node
  }

  clear(): void {
    if (this.blockCount === 0) return
    this.pushHistory()
    // Die Bausteine gehen, der Name der Maske bleibt — er ist kein Baustein.
    const leer = leererBaum()
    leer[WURZEL_ID] = { ...leer[WURZEL_ID], props: { ...this._tree[WURZEL_ID].props } }
    this._tree = leer
    this._selectedId = null
    this.notify(this)
  }

  // Eine geladene Maskendatei ersetzt Bausteine, Quellen und Relationen in EINEM
  // Undo-Schritt.
  ersetzeMaske(inhalt: MaskenInhalt): void {
    this.pushHistory()
    this.setzeBibliotheken(inhalt)
    this._tree = inhalt.tree
    this._selectedId = null
    this._activePageId = WURZEL_ID
    this.notify(this)
  }

  speichereJetzt(): void {
    this._planer.sofort()
  }
}
