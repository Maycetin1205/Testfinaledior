import { reportError } from './report'

type EditingHost = {
  basisHTML_SND_MSG?: (kind: string, message: { EVENT: string }) => void
}

// The document frame treats every mask as display only: it pulls the focus back
// to its own field unless the mask announces that the operator edits in here.
const ENTER = ['KARTEIKARTEN_DEAKTIVIEREN', 'BEARBEITUNG_AKTIV']
// The trailing space belongs to the SoftEngine event name.
const LEAVE = ['BEARBEITUNG_BEENDET', 'KARTEIKARTEN_AKTIVIEREN ']

let announced = false

function announce(events: readonly string[]): boolean {
  const host = globalThis as EditingHost
  if (typeof host.basisHTML_SND_MSG !== 'function') return false
  try {
    for (const event of events) host.basisHTML_SND_MSG('MASKENEVENT', { EVENT: event })
  } catch (error) {
    reportError(
      'Tastatur bei SoftEngine anmelden fehlgeschlagen: '
      + (error instanceof Error ? error.message : String(error)),
    )
    return false
  }
  return true
}

function update(editing: boolean): void {
  if (editing === announced) return
  if (announce(editing ? ENTER : LEAVE)) announced = editing
}

export function startEditingSignal(focusOnUs: () => boolean): void {
  document.addEventListener('focusin', () => { update(focusOnUs()) }, true)
  // On focusout the next field is not focused yet. Is one coming, its focusin
  // decides; only a focus going nowhere ends the editing here.
  document.addEventListener('focusout', (evt) => {
    if (evt.relatedTarget === null) update(false)
  }, true)
}
