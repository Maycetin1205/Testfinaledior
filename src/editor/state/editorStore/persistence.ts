import { ROOT_ID } from '../../../core/block/tree'
import { FileOnDisk } from '../fileOnDisk'
import type { EditorSnapshot } from '../history'
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

// Where the work lives: the browser store always, and the two files the
// builder picked on disk. A change plans a write a moment later; the files
// are written again only once they were picked.
export class EditorPersistence {
  private readonly state: () => EditorSnapshot

  private readonly planner: SavePlanner

  readonly maskOnDisk = new FileOnDisk()

  readonly libraryOnDisk = new FileOnDisk()

  constructor(state: () => EditorSnapshot) {
    this.state = state
    this.planner = new SavePlanner(() => this.write(), SAVE_DEBOUNCE_MS)
  }

  // What the browser store held when the editor opened.
  static load(): { library: StoredLibrary; mask: StoredMask } {
    return { library: loadLibraryFromStorage(), mask: loadFromStorage() ?? emptyMask() }
  }

  plan(): void {
    this.planner.plan()
  }

  now(): void {
    this.planner.now()
  }

  private write(): void {
    const state = this.state()
    persistMask({
      tree: state.tree,
      selectedId: state.selectedId,
      activePageId: state.activePageId ?? ROOT_ID,
    })
    void this.maskOnDisk.writeAgain(packMask(state.tree, state.dataSources, state.relation))
    void this.libraryOnDisk.writeAgain(persistLibrary({
      dataSources: state.dataSources,
      relation: state.relation,
    }))
  }
}
