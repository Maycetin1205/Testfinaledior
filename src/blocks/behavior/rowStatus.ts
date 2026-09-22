import type { PendingKind } from '../../core/block/capability'

export type RowsStatus =
  | 'booked'
  | 'captured'
  | 'changed'
  | 'deletion'
  | 'writes'

  | 'written'
  | 'error'

export interface RowsIcon {
  status: RowsStatus

  title: string
}

const TITLE: Record<RowsStatus, string> = {
  booked: '',
  captured: 'Neu',
  changed: 'Geändert',
  deletion: 'Wird gelöscht',
  writes: 'Wird geschrieben …',
  written: 'Hinausgeschickt',
  error: 'Nicht geschrieben',
}

export class RunState {
  private readonly report: () => void

  private readonly writing = new Map<PendingKind, Set<string>>()

  private readonly error = new Map<PendingKind, Map<string, string>>()

  constructor(report: () => void) {
    this.report = report
  }

  writes(kind: PendingKind, key: string): void {
    this.error.get(kind)?.delete(key)
    const list = this.writing.get(kind) ?? new Set<string>()
    list.add(key)
    this.writing.set(kind, list)
    this.report()
  }

  failed(kind: PendingKind, key: string, message: string): void {
    this.writing.get(kind)?.delete(key)
    const list = this.error.get(kind) ?? new Map<string, string>()
    list.set(key, message)
    this.error.set(kind, list)
    this.report()
  }

  done(kind: PendingKind, written: readonly string[]): void {
    this.writing.get(kind)?.clear()
    const open = this.error.get(kind)
    if (open) {
      for (const key of written) open.delete(key)
    }
    this.report()
  }

  shows(kind: PendingKind, key: string, base: RowsStatus): RowsIcon {
    const message = this.error.get(kind)?.get(key)
    if (message !== undefined) return { status: 'error', title: TITLE.error + ': ' + message }
    if (this.writing.get(kind)?.has(key) === true) {
      return { status: 'writes', title: TITLE.writes }
    }
    return { status: base, title: TITLE[base] }
  }
}
