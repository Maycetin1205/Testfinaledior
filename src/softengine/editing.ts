import { hostCall, seWindow, typable } from './bridge'

// SoftEngine's own masks announce editing before the cursor goes into a field
// (selib DataList, StartEditMode and StopEditMode). A mask that does not
// counts as display only, and the Positionserfassung takes the keyboard back
// within 80 ms of every click (measured 2026-10-06).
const ENTER = ['KARTEIKARTEN_DEAKTIVIEREN', 'BEARBEITUNG_AKTIV']
// The trailing space is SoftEngine's own spelling.
const LEAVE = ['BEARBEITUNG_BEENDET', 'KARTEIKARTEN_AKTIVIEREN ']

const editing = { installed: false, on: false }

function tell(events: readonly string[]): boolean {
  const g = seWindow()
  if (typeof g.basisHTML_SND_MSG !== 'function') return false
  return hostCall(() => {
    for (const EVENT of events) g.basisHTML_SND_MSG('MASKENEVENT', { EVENT })
  })
}

function origin(evt: Event): unknown {
  return evt.composedPath()[0] ?? evt.target
}

// Before the click lands, so SoftEngine knows before it reacts. Only a click
// on something else in the mask ends the editing; a lost window focus does
// not, because that is exactly what the theft looks like.
export function announceEditing(): void {
  if (editing.installed) return
  editing.installed = true
  const enter = (): void => { if (!editing.on && tell(ENTER)) editing.on = true }
  const leave = (): void => { if (editing.on && tell(LEAVE)) editing.on = false }
  window.addEventListener('pointerdown', (evt) => { if (typable(origin(evt))) enter(); else leave() }, true)
  window.addEventListener('focusin', (evt) => { if (typable(origin(evt))) enter() }, true)
}
