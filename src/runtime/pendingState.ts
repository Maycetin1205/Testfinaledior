import type { PendingKind } from '../core/block/capability'
import { contractOf } from '../core/block/registry'

export const PENDING_EVENT = 'ff-pending-change'

const KINDS: readonly PendingKind[] = ['captured', 'changed', 'deleted']

export function pendingRows(carrier: HTMLElement, kind: PendingKind): number {
  if (kind === 'captured') return contractOf(carrier, 'capture')?.capturedRows.length ?? 0
  if (kind === 'changed') return contractOf(carrier, 'change')?.changedRows.length ?? 0
  return contractOf(carrier, 'delete')?.deletedRows.length ?? 0
}

const last = new WeakMap<HTMLElement, string>()

export function reportPendingMarks(el: HTMLElement): void {
  const now = KINDS.map((kind) => pendingRows(el, kind)).join(' ')
  if (last.get(el) === now) return
  last.set(el, now)
  el.dispatchEvent(new CustomEvent(PENDING_EVENT, { bubbles: true, composed: true }))
}
