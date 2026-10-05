import { blockType } from '../../block/registry'
import type { Unread } from '../../unread'

export function popupIdRead(raw: Unread<{ popupId: string }>): string | null {
  return typeof raw.popupId === 'string' ? raw.popupId : null
}

// The export names the page; a step that only knows its id opens nothing.
export function popupNameRead(raw: Unread<{ popup: string; popupId: string }>): string | null {
  if (typeof raw.popup === 'string') return raw.popup
  return typeof raw.popupId === 'string' ? '' : null
}

export function applyPopupStep(root: ParentNode, name: string, open: boolean): void {
  if (name.trim() === '') return

  const popupType = blockType('popup')
  const all = popupType === undefined ? [] : Array.from(root.querySelectorAll(popupType.tag))
  const hit = all.filter(
    (el) => (el.getAttribute('name') ?? popupType?.properties.name?.default) === name,
  )
  if (hit.length !== 1) return
  const target = hit[0]
  if (!open) {
    target.removeAttribute('open')
    return
  }
  for (const el of all) {
    if (el !== target) el.removeAttribute('open')
  }
  target.setAttribute('open', '')
}

export function popupIdMoved(
  popupId: string,
  newId: (oldId: string) => string | undefined,
): string | undefined {
  return popupId === '' ? undefined : newId(popupId)
}
