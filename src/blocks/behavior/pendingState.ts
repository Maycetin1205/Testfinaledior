import type {
  ChangeCarrierElement,
  CaptureCarrierElement,
  DeleteCarrierElement,
  PendingKind,
} from '../../core/block/capability'

export const PENDING_EVENT = 'ff-vormerkungen'

export type PendingCarrier = HTMLElement
  & Partial<CaptureCarrierElement>
  & Partial<ChangeCarrierElement>
  & Partial<DeleteCarrierElement>

const KINDS: readonly PendingKind[] = ['captured', 'changed', 'deleted']

export function pendingRows(carrier: PendingCarrier, kind: PendingKind): number {
  if (kind === 'captured') return carrier.capturedRows?.length ?? 0
  if (kind === 'changed') return carrier.changedRows?.length ?? 0
  return carrier.deletedRows?.length ?? 0
}

const last = new WeakMap<HTMLElement, string>()

export function reportPendingMarks(el: PendingCarrier): void {
  const now = KINDS.map((kind) => pendingRows(el, kind)).join(' ')
  if (last.get(el) === now) return
  last.set(el, now)
  el.dispatchEvent(new CustomEvent(PENDING_EVENT, { bubbles: true, composed: true }))
}
