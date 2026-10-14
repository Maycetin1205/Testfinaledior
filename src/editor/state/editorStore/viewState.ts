import type { LookupWindow } from '../../../core/block/capability'
import type { StepTab } from '../../actions/StepWindow'
import type { NoticeText } from '../../widgets/Notice'
import { loadOutlines, persistOutlines } from '../maskStorage'

// What a button did a moment ago; it wears a check for that long.
export type Deed = 'saved' | 'exported' | 'template'

const DONE_MS = 1600

// Which step window is open: for a step of a block's chain, or for a new one.
export interface OpenStep {
  blockId: string
  eventKey: string
  stepId: string | null
  tab: StepTab
}

// Which column's calculation the editor shows, in the window in the middle.
export interface OpenCalculation {
  blockId: string
  column: string
}

// Which lookup window the editor shows, and for which spot of which block.
export interface OpenLookup {
  blockId: string
  window: LookupWindow
  slot: number
}

// What the editor shows besides the mask: the open windows, the notice, the
// check on a button that just did its deed, the block waiting for a click and
// the outlines. That is no change to the mask, so it reports to its own
// signal and plans no save.
export class EditorView {
  private readonly changed: () => void

  private _stepWindow: OpenStep | null = null

  private _calculationWindow: OpenCalculation | null = null

  private _lookupWindow: OpenLookup | null = null

  private _followPickFor: string | null = null

  private _dataWindow = false

  private _masksWindow = false

  private _notice: NoticeText | null = null

  private _done: Deed | null = null

  private doneTimer: ReturnType<typeof setTimeout> | null = null

  private _outlines = loadOutlines()

  constructor(changed: () => void) {
    this.changed = changed
  }

  // The window "Daten" over the mask: closed until "Daten" is clicked.
  get dataWindow(): boolean { return this._dataWindow }

  showData(open: boolean): void {
    if (this._dataWindow === open) return
    this._dataWindow = open
    this.changed()
  }

  // The window "Masken": the masks of the folder, closed until "Masken" is clicked.
  get masksWindow(): boolean { return this._masksWindow }

  showMasks(open: boolean): void {
    if (this._masksWindow === open) return
    this._masksWindow = open
    this.changed()
  }

  // What went wrong with saving, loading or exporting, until it is read; one
  // at a time, a later one takes its place.
  get notice(): NoticeText | null { return this._notice }

  showNotice(notice: NoticeText | null): void {
    if (this._notice === notice) return
    this._notice = notice
    this.changed()
  }

  get done(): Deed | null { return this._done }

  markDone(deed: Deed): void {
    if (this.doneTimer !== null) clearTimeout(this.doneTimer)
    this._done = deed
    this.changed()
    this.doneTimer = setTimeout(() => {
      this.doneTimer = null
      this._done = null
      this.changed()
    }, DONE_MS)
  }

  // A quiet edge around every block on the canvas, also an empty one; the
  // browser keeps the choice. The mask never shows it.
  get outlines(): boolean { return this._outlines }

  showOutlines(on: boolean): void {
    if (this._outlines === on) return
    this._outlines = on
    persistOutlines(on)
    this.changed()
  }

  get stepWindow(): OpenStep | null { return this._stepWindow }

  // Lives beside the mask, not in the bar: a click on the mask beside the
  // window closes the bar but keeps what is being typed in the window.
  openStep(open: OpenStep | null): void {
    if (this._stepWindow === open) return
    this._stepWindow = open
    this.changed()
  }

  get calculationWindow(): OpenCalculation | null { return this._calculationWindow }

  openCalculation(open: OpenCalculation | null): void {
    if (this._calculationWindow === open) return
    this._calculationWindow = open
    this.changed()
  }

  get lookupWindow(): OpenLookup | null { return this._lookupWindow }

  setLookupWindow(open: OpenLookup | null): void {
    if (this._lookupWindow === open) return
    this._lookupWindow = open
    this.changed()
  }

  // The block that waits for a click on the block whose selection it follows.
  get followPickFor(): string | null { return this._followPickFor }

  pickFollowFor(blockId: string | null): void {
    if (this._followPickFor === blockId) return
    this._followPickFor = blockId
    this.changed()
  }
}
