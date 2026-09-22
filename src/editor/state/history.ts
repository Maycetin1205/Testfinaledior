import type { MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'

export interface EditorSnapshot {
  tree: MaskTree
  selectedId: string | null
  activePageId?: string
  dataSources: readonly DataSource[]
  relation: readonly RelationTemplate[]
}

const HISTORY_LIMIT = 50

export class History {
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

  transaction<T>(makeSnapshot: () => EditorSnapshot, tun: () => T): T {
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

export interface GestureBracket {
  open(): void
  close(): void
}

export function gestureBracket(open: () => void, close: () => void): GestureBracket {
  let opened = false
  let done = false
  return {
    open: () => {
      if (done || opened) return
      opened = true
      open()
    },
    close: () => {
      if (done) return
      done = true
      if (opened) close()
    },
  }
}
