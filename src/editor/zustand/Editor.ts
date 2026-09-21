// Der Editor-Zustand: Baustein-Baum, Auswahl, Historie, Bibliotheken.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../../kern/maske/baum'
import { neuerTeilbaum } from '../../kern/maske/neuerBaustein'
import { darfEnthalten, bausteinArt } from '../../kern/maske/registry'
import { rasterMassVon } from '../../kern/maske/raster'
import { type Ketten } from '../../kern/daten/aktionen'
import { type Datenquelle } from '../../kern/daten/datenquellen'
import { type QuelleInReichweite } from '../../kern/daten/weitereQuellen'
import { DataSourceStore } from './DataSourceStore'
import { ersteQuelleInReichweite, quellenInReichweite } from '../../kern/maske/quellenReichweite'
import { gestenKlammer, Historie, type EditorSnapshot, type GestenKlammer } from './history'
import type { MaskenInhalt } from './maskenDatei'
import { meldungen } from './meldungen'
import { loadFromStorage, persistState, SAVE_DEBOUNCE_MS } from './persistence'
import { RelationStore } from './RelationStore'
import { gestricheneKennungen, ohneSpaltenZeiger } from './spaltenAufraeumen'
import { SpeicherPlaner } from './speicherPlaner'
import { Subject } from './Subject'
import { dupliziereTeilbaum } from './duplizieren'
import { teilbaumIds, leererBaum } from '../../kern/maske/baumOps'
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
  seiteVon,
  seitenDerMaske,
  type SeitenEintrag,
} from '../../kern/maske/seiten'
import {
  istRasterFlaeche,
  neuerBlockAnZelle,
  platzAuf,
  verschiebeInContainer,
  zelleneinzug,
  zellenGroesse,
} from '../../kern/maske/rasterFlaeche'
import { auswahlAufSeite, auswahlZiel } from '../../kern/maske/auswahl'
import { deepClone } from '../../kern/deepClone'

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
    }, this.datencenterVonHandGeaendert),
    SAVE_DEBOUNCE_MS,
  )
  private _hydrated = false

  // Nur nach einer Aenderung von Hand darf das Sichern das gesicherte
  // Datencenter aermer machen (persistence.ts).
  private get datencenterVonHandGeaendert(): boolean {
    return this.datenquellen.vonHandGeaendert || this.relationen.vonHandGeaendert
  }

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
    if (def?.seite !== true) return null
    const name = freierSeitenName(this.pages.map((p) => p.name), def.name)
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

  addBlock(
    type: string,
    parentId?: string,
    index?: number,
    zeilen: number | null = null,
  ): Baustein | null {
    const parent = this._tree[parentId ?? this.rootId]
    if (!parent || !darfEnthalten(parent.typ, type)) return null
    const spec = rasterMassVon(bausteinArt(type))
    const platz = istRasterFlaeche(parent)
      ? platzAuf(this._tree, parent.id, spec.startBreite, spec.startHoehe, zeilen)
      : undefined
    if (platz === null) return null
    this.pushHistory()
    const { nodes, rootId } = neuerTeilbaum(type)
    const node = nodes[rootId]
    node.elternId = parent.id

    if (platz) {
      node.werte = { ...node.werte, rasterX: platz.x, rasterY: platz.y, rasterW: spec.startBreite, rasterH: spec.startHoehe }
    }
    const childIds = [...parent.kinderIds]
    const at = index === undefined
      ? childIds.length
      : Math.max(0, Math.min(index, childIds.length))
    childIds.splice(at, 0, node.id)
    this._tree = {
      ...this._tree,
      ...nodes,
      [parent.id]: { ...parent, kinderIds: childIds },
    }
    this._selectedId = node.id
    this.notify(this)
    return node
  }

  isInSubtree(ancestorId: string, id: string): boolean {
    let cur: string | null | undefined = id
    while (cur) {
      if (cur === ancestorId) return true
      cur = this._tree[cur]?.elternId
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
    if (node.elternId && next[node.elternId]) {
      const parent = next[node.elternId]
      next[node.elternId] = { ...parent, kinderIds: parent.kinderIds.filter((c) => c !== id) }
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
    const def = bausteinArt(node.typ)

    const wert = schreibWert(def, this.pages, id, attr, value)
    if (wert === null) return false

    if (Object.is(node.werte[attr], wert)) return true
    this.pushHistory()
    const next: Maskenbaum = {
      ...this._tree,
      [id]: { ...node, werte: { ...node.werte, [attr]: wert } },
    }

    const prop = def?.eigenschaften.find((p) => p.schluessel === attr)
    if (prop?.einzigUnterGeschwistern && wert === 'ja' && node.elternId) {
      for (const sibId of this._tree[node.elternId]?.kinderIds ?? []) {
        const sib = next[sibId]
        if (sibId !== id && sib?.typ === node.typ && sib.werte[attr] === 'ja') {
          next[sibId] = { ...sib, werte: { ...sib.werte, [attr]: 'nein' } }
        }
      }
    }

    // Verschwindet eine Kennung aus einer Liste, darf kein Ketten-Parameter mehr
    // auf sie zeigen; die Ketten koennen auf anderen Bausteinen liegen.
    const geputzt = ohneSpaltenZeiger(
      next,
      id,
      gestricheneKennungen(def, attr, node.werte[attr], wert),
    )
    if (geputzt.parameter > 0) {
      meldungen.melde(
        `Spalte gelöscht: ${geputzt.parameter} Ketten-Parameter auf `
        + `${geputzt.bausteine} Baustein(en) zeigten darauf und sind jetzt ausgeschaltet. `
        + 'Strg+Z holt alles zurück.',
      )
    }

    this._tree = typeof wert === 'string' && def?.seite === true && attr === 'name'
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
    if (Object.keys(clean).length > 0) next.ketten = clean
    else delete next.ketten
    this._tree = { ...this._tree, [id]: next }
    this.notify(this)
  }

  duplicateBlock(id: string, zeilen: number | null = null): Baustein | null {
    if (this.isRemoveProtected(id)) return null
    const res = dupliziereTeilbaum(this._tree, id, zeilen)
    if (!res) return null
    this.pushHistory()
    this._tree = res.tree
    // Die Kopie einer Seite ist selbst eine Seite: ohne den Wechsel bliebe sie
    // hinter der alten liegen und die Auswahl darauf fiele weg.
    this._activePageId = seiteVon(this._tree, res.kopieId)
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
    leer[WURZEL_ID] = { ...leer[WURZEL_ID], werte: { ...this._tree[WURZEL_ID].werte } }
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
