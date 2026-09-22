import { ROOT_ID, type BlockNode, type MaskTree } from '../../core/block/tree'
import type { PropertyValue } from '../../core/block/property'
import { newSubtree } from '../../core/block/newBlock'
import { mayContain, blockType } from '../../core/block/registry'
import { gridMetricsOf } from '../../core/block/grid'
import { type ActionChains } from '../../core/data/actions'
import { type DataSource } from '../../core/data/dataSources'
import { type SourceInReach } from '../../core/data/extraSources'
import { DataSourceStore } from './DataSourceStore'
import { firstSourceInReach, sourcesInReach } from '../../core/block/sourcesInReach'
import { gestureBracket, History, type EditorSnapshot, type GestureBracket } from './history'
import type { MaskContent } from './maskFile'
import { messages } from './messages'
import { loadFromStorage, persistState, SAVE_DEBOUNCE_MS } from './maskStorage'
import { RelationStore } from './RelationStore'
import { droppedKeys, withoutColumnsPointer } from './columnCleanup'
import { SavePlanner } from './savePlanner'
import { Subject } from './Subject'
import { duplicateSubtree } from './duplicate'
import { subtreeIds, emptyTree } from '../../core/block/treeOps'
import {
  isRemoveProtected as isTemplateProtected,
  templateMarkFor as templateMarkInTree,
} from './templateRules'
import {
  activePagesRoot,
  freePagesName,
  childrenInFlow,
  plainNamesTrail,
  writeValue,
  pageOf,
  pagesTheMask,
  type PagesEntry,
} from '../../core/block/pages'
import {
  isGridArea,
  newBlockOnCell,
  slotOn,
  moveInContainer,
  cellMoveIn,
  cellsSize,
} from '../../core/block/gridArea'
import { selectionOnPage, selectionTarget } from '../../core/block/selection'
import { deepClone } from '../../core/deepClone'

export class EditorStore extends Subject<EditorStore> {
  readonly dataSources: DataSourceStore
  readonly relation: RelationStore

  private _tree: MaskTree = emptyTree()
  private _selectedId: string | null = null

  private _activePageId: string = ROOT_ID
  private _version = 0
  private _history = new History()

  private _planner = new SavePlanner(
    () => persistState(this._tree, this._selectedId, {
      dataSources: this.dataSources.list,
      relation: this.relation.list,
      activePageId: this.activePageId,
    }, this.dataCenterOfHandChanged),
    SAVE_DEBOUNCE_MS,
  )
  private _hydrated = false

  private get dataCenterOfHandChanged(): boolean {
    return this.dataSources.ofHandChanged || this.relation.ofHandChanged
  }

  private _placesAgainFrom = false

  constructor(content?: MaskContent) {
    super()
    const persisted = content ? null : loadFromStorage()
    this.dataSources = new DataSourceStore(content?.dataSources ?? persisted?.dataSources)
    this.relation = new RelationStore(content?.relation ?? persisted?.relation)
    this._tree = content?.tree ?? persisted?.tree ?? emptyTree()
    this._activePageId = persisted?.activePageId ?? ROOT_ID
    this._selectedId = this.selectionOnActivePage(persisted?.selectedId ?? null)
    this._hydrated = true

    for (const store of [this.dataSources, this.relation]) {
      store.observeBeforeChange(() => {
        if (!this._placesAgainFrom) this.pushHistory()
      })
      store.subscribe(() => {
        if (!this._placesAgainFrom) this.notify(this)
      })
    }
  }

  get tree(): Readonly<MaskTree> { return this._tree }

  get rootId(): string {
    return activePagesRoot(this._tree, this._activePageId)
  }

  get activePageId(): string { return this.rootId }

  get pages(): PagesEntry[] {
    return pagesTheMask(this._tree)
  }

  private selectionOnActivePage(id: string | null): string | null {
    return selectionOnPage(this._tree, id, this.rootId)
  }

  setActivePage(id: string): void {
    const next = activePagesRoot(this._tree, id)
    if (next === this._activePageId) return
    this._activePageId = next
    this._selectedId = null
    this.notify(this)
  }

  addPage(type: string): BlockNode | null {
    const def = blockType(type)
    if (def?.page !== true) return null
    const name = freePagesName(this.pages.map((p) => p.name), def.name)
    return this.transaction(() => {
      const node = this.addBlock(type, ROOT_ID)
      if (node) {
        this._activePageId = node.id
        this.updateProperty(node.id, 'name', name)
      }
      return node
    })
  }

  getNode(id: string): BlockNode | undefined { return this._tree[id] }

  childNodesOf(parentId: string): BlockNode[] {
    return childrenInFlow(this._tree, parentId)
  }

  get blockCount(): number { return Object.keys(this._tree).length - 1 }

  get selectedId(): string | null { return this._selectedId }
  get selectedNode(): BlockNode | null {
    if (this._selectedId === null) return null
    const node = this._tree[this._selectedId]
    return node && node.id !== ROOT_ID ? node : null
  }

  get version(): number { return this._version }
  get canUndo(): boolean { return this._history.canUndo }
  get canRedo(): boolean { return this._history.canRedo }

  override notify(data: EditorStore): void {
    this._version++
    try {
      super.notify(data)
    } finally {
      if (this._hydrated) this._planner.plan()
    }
  }

  private snapshot(): EditorSnapshot {
    return {
      tree: deepClone(this._tree),
      selectedId: this._selectedId,
      activePageId: this.activePageId,
      dataSources: this.dataSources.list,
      relation: this.relation.list,
    }
  }

  private setLibraries(state: Pick<EditorSnapshot, 'dataSources' | 'relation'>): void {
    this._placesAgainFrom = true
    try {
      if (this.dataSources.list !== state.dataSources) this.dataSources.replaceAll(state.dataSources)
      if (this.relation.list !== state.relation) this.relation.replaceAll(state.relation)
    } finally {
      this._placesAgainFrom = false
    }
  }

  private pushHistory(): void {
    this._history.record(() => this.snapshot())
  }

  beginTransaction(): void {
    this._history.begin(() => this.snapshot())
  }

  endTransaction(): void {
    this._history.end()
  }

  transaction<T>(tun: () => T): T {
    return this._history.transaction(() => this.snapshot(), tun)
  }

  openGesture(): GestureBracket {
    return gestureBracket(() => this.beginTransaction(), () => this.endTransaction())
  }

  undo(): void {
    const prev = this._history.undo(() => this.snapshot())
    if (!prev) return
    this.spotFrom(prev)
  }

  redo(): void {
    const next = this._history.redo(() => this.snapshot())
    if (!next) return
    this.spotFrom(next)
  }

  private spotFrom(state: EditorSnapshot): void {
    this.setLibraries(state)
    this._tree = state.tree
    this._activePageId = state.activePageId ?? ROOT_ID
    this._selectedId = this.selectionOnActivePage(state.selectedId)
    this.notify(this)
  }

  addBlock(
    type: string,
    parentId?: string,
    index?: number,
    rows: number | null = null,
  ): BlockNode | null {
    const parent = this._tree[parentId ?? this.rootId]
    if (!parent || !mayContain(parent.type, type)) return null
    const spec = gridMetricsOf(blockType(type))
    const slot = isGridArea(parent)
      ? slotOn(this._tree, parent.id, spec.startWidth, spec.startHeight, rows)
      : undefined
    if (slot === null) return null
    this.pushHistory()
    const { nodes, rootId } = newSubtree(type)
    const node = nodes[rootId]
    node.parentId = parent.id

    if (slot) {
      node.values = { ...node.values, gridX: slot.x, gridY: slot.y, gridW: spec.startWidth, gridH: spec.startHeight }
    }
    const childIds = [...parent.childIds]
    const at = index === undefined
      ? childIds.length
      : Math.max(0, Math.min(index, childIds.length))
    childIds.splice(at, 0, node.id)
    this._tree = {
      ...this._tree,
      ...nodes,
      [parent.id]: { ...parent, childIds: childIds },
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
    if (!node || id === ROOT_ID) return

    if (this.isRemoveProtected(id)) return
    this.pushHistory()
    const remove = new Set(subtreeIds(this._tree, id))
    const next: MaskTree = {}
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

  chooseHit(hitId: string): void {
    const target = selectionTarget(this._tree, hitId)
    if (target !== null) this.selectBlock(target)
  }

  dataSourceFor(id: string): DataSource | undefined {
    return firstSourceInReach(this._tree, id, this.dataSources.list)
  }

  sourcesFor(id: string): SourceInReach[] {
    return sourcesInReach(this._tree, id, this.dataSources.list)
  }

  templateMarkFor(id: string): string | undefined {
    return templateMarkInTree(this._tree, id)
  }

  isRemoveProtected(id: string): boolean {
    return isTemplateProtected(this._tree, id)
  }

  updateProperty(id: string, attr: string, raw: unknown): boolean {
    const node = this._tree[id]
    if (!node) return false
    const def = blockType(node.type)

    const value = writeValue(def, this.pages, id, attr, raw)
    if (value === null) return false

    if (Object.is(node.values[attr], value)) return true
    this.pushHistory()
    const next: MaskTree = {
      ...this._tree,
      [id]: { ...node, values: { ...node.values, [attr]: value as PropertyValue } },
    }

    const prop = def?.properties[attr]
    if (prop?.onlyUnderSiblings && value === true && node.parentId) {
      for (const sibId of this._tree[node.parentId]?.childIds ?? []) {
        const sib = next[sibId]
        if (sibId !== id && sib?.type === node.type && sib.values[attr] === true) {
          next[sibId] = { ...sib, values: { ...sib.values, [attr]: false } }
        }
      }
    }

    const cleaned = withoutColumnsPointer(
      next,
      id,
      droppedKeys(def, attr, node.values[attr], value),
    )
    if (cleaned.parameter > 0) {
      messages.report(
        `Spalte gelöscht: ${cleaned.parameter} Ketten-Parameter auf `
        + `${cleaned.blocks} Baustein(en) zeigten darauf und sind jetzt ausgeschaltet. `
        + 'Strg+Z holt alles zurück.',
      )
    }

    this._tree = typeof value === 'string' && def?.page === true && attr === 'name'
      ? plainNamesTrail(cleaned.tree, id, value)
      : cleaned.tree
    this.notify(this)
    return true
  }

  updateBlockEvents(id: string, events: ActionChains): void {
    const node = this._tree[id]
    if (!node || id === ROOT_ID) return
    this.pushHistory()
    const clean: ActionChains = {}
    for (const [key, steps] of Object.entries(events)) {
      if (steps.length > 0) clean[key] = steps
    }
    const next: BlockNode = { ...node }
    if (Object.keys(clean).length > 0) next.chains = clean
    else delete next.chains
    this._tree = { ...this._tree, [id]: next }
    this.notify(this)
  }

  duplicateBlock(id: string, rows: number | null = null): BlockNode | null {
    if (this.isRemoveProtected(id)) return null
    const res = duplicateSubtree(this._tree, id, rows)
    if (!res) return null
    this.pushHistory()
    this._tree = res.tree

    this._activePageId = pageOf(this._tree, res.copyId)
    this._selectedId = res.copyId
    this.notify(this)
    return res.tree[res.copyId]
  }

  moveNode(id: string, newParentId: string, index: number): void {
    if (this.isRemoveProtected(id)) return
    const next = moveInContainer(this._tree, id, newParentId, index)
    if (!next) return
    this.pushHistory()
    this._tree = next
    this.notify(this)
  }

  moveNodeToCell(id: string, parentId: string, x: number, y: number): void {
    const next = cellMoveIn(this._tree, id, parentId, x, y)
    if (!next) return
    this.pushHistory()
    this._tree = next
    this._selectedId = id
    this.notify(this)
  }

  resizeNodeToCells(id: string, axis: 'x' | 'y', value: number): void {
    const next = cellsSize(this._tree, id, axis, value)
    if (!next) return
    this.pushHistory()
    this._tree = next
    this.notify(this)
  }

  addBlockAtCell(type: string, parentId: string, x: number, y: number): BlockNode | null {
    const res = newBlockOnCell(this._tree, type, parentId, x, y)
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

    const empty = emptyTree()
    empty[ROOT_ID] = { ...empty[ROOT_ID], values: { ...this._tree[ROOT_ID].values } }
    this._tree = empty
    this._selectedId = null
    this.notify(this)
  }

  replaceMask(content: MaskContent): void {
    this.pushHistory()
    this.setLibraries(content)
    this._tree = content.tree
    this._selectedId = null
    this._activePageId = ROOT_ID
    this.notify(this)
  }

  saveNow(): void {
    this._planner.now()
  }
}
