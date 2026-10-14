import { ROOT_ID } from '../../../core/block/tree'
import { FileOnDisk } from '../fileOnDisk'
import type { EditorSnapshot } from '../history'
import { MaskFolder } from '../maskFolder'
import { packMask } from '../maskFile'
import {
  emptyMask,
  loadFromStorage,
  loadLibraryFromStorage,
  persistLibrary,
  persistMask,
  SAVE_DEBOUNCE_MS,
  type StoredLibrary,
  type StoredMask,
} from '../maskStorage'
import { SavePlanner } from '../savePlanner'

// Where the work lives: the browser store always, the file of the mask in the
// folder of masks or the two files the builder picked on disk. A change plans
// a write a moment later; the files are written only once they are known.
export class EditorPersistence {
  private readonly state: () => EditorSnapshot

  private readonly planner: SavePlanner

  readonly maskOnDisk = new FileOnDisk()

  readonly libraryOnDisk = new FileOnDisk()

  readonly folder = new MaskFolder()

  // The mask as the browser store last kept it, and when it changed there;
  // a click on a block keeps it again but changes nothing, nor the time.
  private keptText: string | null = null

  private _keptAt = 0

  constructor(state: () => EditorSnapshot) {
    this.state = state
    this.planner = new SavePlanner(() => this.write(), SAVE_DEBOUNCE_MS)
  }

  // What the browser store held when the editor opened.
  static load(): { library: StoredLibrary; mask: StoredMask } {
    return { library: loadLibraryFromStorage(), mask: loadFromStorage() ?? emptyMask() }
  }

  started(mask: StoredMask, library: StoredLibrary): void {
    this.maskOnDisk.expect(mask.file)
    this.keptText = packMask(mask.tree, library.dataSources, library.relation)
    this._keptAt = mask.savedAt
  }

  get keptAt(): number { return this._keptAt }

  plan(): void {
    this.planner.plan()
  }

  now(): void {
    this.planner.now()
  }

  private write(): void {
    const state = this.state()
    const text = packMask(state.tree, state.dataSources, state.relation)
    if (text !== this.keptText) {
      this.keptText = text
      this._keptAt = Date.now()
    }
    persistMask({
      tree: state.tree,
      selectedId: state.selectedId,
      activePageId: state.activePageId ?? ROOT_ID,
      file: this.maskOnDisk.path,
      savedAt: this._keptAt,
    })
    void this.maskOnDisk.writeAgain(text)
    void this.libraryOnDisk.writeAgain(persistLibrary({
      dataSources: state.dataSources,
      relation: state.relation,
    }))
  }
}
