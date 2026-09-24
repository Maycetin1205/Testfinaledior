import type { MaskHost } from './maskHost'
import { softEngineHost } from './softEngineHost'

// What the running mask holds besides its elements. A page carries one document
// with one mask, so there is exactly one of it.
export interface MaskState {
  // Whom the blocks ask for data and send their actions to.
  host: MaskHost
  selection: {
    chosen: Map<string, { row: unknown; trait: string; number: number }>
    listeners: Set<(byControls: boolean) => void>
    counter: number
    messageRuns: boolean
    lateReport: boolean
    toControls: boolean
  }
  chosenDay: {
    day: string
    listeners: Set<() => void>
  }
  lookupWindow: {
    open: HTMLElement | null
    openFor: HTMLElement | null
    backFocus: HTMLElement | (() => void) | null
  }
  fetchingSources: {
    lastPrint: Map<string, string>
    silentLoaded: Map<string, Set<string>>
    wired: boolean
  }
  catchingFrames: { readonly isConnected: boolean; close(): void }[]
}

export const maskState: MaskState = {
  host: softEngineHost,
  selection: {
    chosen: new Map(),
    listeners: new Set(),
    counter: 0,
    messageRuns: false,
    lateReport: false,
    toControls: false,
  },
  chosenDay: {
    day: '',
    listeners: new Set(),
  },
  lookupWindow: {
    open: null,
    openFor: null,
    backFocus: null,
  },
  fetchingSources: {
    lastPrint: new Map(),
    silentLoaded: new Map(),
    wired: false,
  },
  catchingFrames: [],
}
