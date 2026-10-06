import type { LookupWindow } from '../../../core/block/capability'
import type { StepTab } from '../../actions/StepWindow'

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

// What the editor shows besides the mask: the open windows and the block
// waiting for a click. That is no change to the mask, so it reports to its
// own signal and plans no save.
export class EditorView {
  private readonly changed: () => void

  private _stepWindow: OpenStep | null = null

  private _calculationWindow: OpenCalculation | null = null

  private _lookupWindow: OpenLookup | null = null

  private _followPickFor: string | null = null

  private _dataWindow = false

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
