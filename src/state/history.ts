// Die Historie fuer Strg+Z: Staende der ganzen Maske.
import type { Maskenbaum } from '../core/blocks/BlockData'
import type { Datenquelle } from '../core/data/dataSources'
import type { RelationsVorlage } from '../core/data/relations'

// Ein Stand der ganzen Maske: Bausteine, Auswahl und die beiden Bibliotheken.
// Strg+Z nimmt darum auch eine geloeschte Datenquelle zurueck.
export interface EditorSnapshot {
  tree: Maskenbaum
  selectedId: string | null
  activePageId?: string
  datenquellen: readonly Datenquelle[]
  relationen: readonly RelationsVorlage[]
}

const HISTORY_LIMIT = 50

export class Historie {
  private _past: EditorSnapshot[] = []
  private _future: EditorSnapshot[] = []

  private _txDepth = 0

  get canUndo(): boolean { return this._past.length > 0 }
  get canRedo(): boolean { return this._future.length > 0 }

  record(makeSnapshot: () => EditorSnapshot): void {
    if (this._txDepth > 0) return
    this._past.push(makeSnapshot())
    if (this._past.length > HISTORY_LIMIT) this._past.shift()
    this._future = []
  }

  begin(makeSnapshot: () => EditorSnapshot): void {
    if (this._txDepth === 0) this.record(makeSnapshot)
    this._txDepth++
  }

  end(): void {
    if (this._txDepth > 0) this._txDepth--
  }

  transaktion<T>(makeSnapshot: () => EditorSnapshot, tun: () => T): T {
    this.begin(makeSnapshot)
    try {
      return tun()
    } finally {
      this.end()
    }
  }

  undo(makeCurrent: () => EditorSnapshot): EditorSnapshot | null {
    const prev = this._past.pop()
    if (!prev) return null
    this._future.push(makeCurrent())
    return prev
  }

  redo(makeCurrent: () => EditorSnapshot): EditorSnapshot | null {
    const next = this._future.pop()
    if (!next) return null
    this._past.push(makeCurrent())
    return next
  }
}

export interface GestenKlammer {
  oeffne(): void
  schliesse(): void
}

export function gestenKlammer(oeffnen: () => void, schliessen: () => void): GestenKlammer {
  let offen = false
  let fertig = false
  return {
    oeffne: () => {
      if (fertig || offen) return
      offen = true
      oeffnen()
    },
    schliesse: () => {
      if (fertig) return
      fertig = true
      if (offen) schliessen()
    },
  }
}
