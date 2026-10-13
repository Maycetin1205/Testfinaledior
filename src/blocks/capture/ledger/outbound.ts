import type { PendingKind } from '../../../core/block/capability'

export type RowsStatus =
  | 'booked'
  | 'captured'
  | 'changed'
  | 'writes'

  | 'written'
  | 'error'

export interface RowState {
  status: RowsStatus
}

// What is out with the document: per kind of run the keys being written and
// the keys whose write failed. A row shows that before anything else.
export class Outbound {
  private readonly report: () => void

  private readonly writing = new Map<PendingKind, Set<string>>()

  private readonly errors = new Map<PendingKind, Set<string>>()

  constructor(report: () => void) {
    this.report = report
  }

  writes(kind: PendingKind, key: string): void {
    this.errors.get(kind)?.delete(key)
    const list = this.writing.get(kind) ?? new Set<string>()
    list.add(key)
    this.writing.set(kind, list)
    this.report()
  }

  failed(kind: PendingKind, key: string): void {
    this.writing.get(kind)?.delete(key)
    const list = this.errors.get(kind) ?? new Set<string>()
    list.add(key)
    this.errors.set(kind, list)
    this.report()
  }

  // These rows are through: they are writing no longer and have no error
  // left. Rows of another run going out at the same time keep their mark.
  done(kind: PendingKind, keys: readonly string[]): void {
    const writing = this.writing.get(kind)
    const open = this.errors.get(kind)
    for (const key of keys) {
      writing?.delete(key)
      open?.delete(key)
    }
    this.report()
  }

  shows(kind: PendingKind, key: string, base: RowsStatus): RowState {
    if (this.errors.get(kind)?.has(key) === true) return { status: 'error' }
    if (this.writing.get(kind)?.has(key) === true) return { status: 'writes' }
    return { status: base }
  }
}
