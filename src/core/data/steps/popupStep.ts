import { blockType } from '../../block/registry'
import type { CheckWorld, StepSummary } from './stepAdapter'

export function popupIdRead(raw: Readonly<Record<string, unknown>>): string | null {
  return typeof raw.popupId === 'string' ? raw.popupId : null
}

// The export names the page; a step that only knows its id opens nothing.
export function popupNameRead(raw: Readonly<Record<string, unknown>>): string | null {
  if (typeof raw.popup === 'string') return raw.popup
  return typeof raw.popupId === 'string' ? '' : null
}

export function popupProblem(popupId: string, world: CheckWorld): string | null {
  if (popupId.trim() === '') return 'Der Popup-Schritt hat kein Popup gewählt.'
  if (world.popupIds && !world.popupIds.includes(popupId)) {
    return 'Der Popup-Schritt verweist auf eine gelöschte Popup-Seite.'
  }
  return null
}

export function popupSummary(what: string, name: string | undefined): StepSummary {
  return { what, detail: name ? ` — ${name}` : '', target: '', origin: '', table: '' }
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
