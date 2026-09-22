import { isObjekt, messagesContent, dataFromContent, type Objekt } from './data'
import { startEditingSignal } from './editingSignal'
import { reportError } from './report'

/* eslint-disable @typescript-eslint/no-explicit-any -- SEDATA/selib sind
   fremde, untypisierte SoftEngine-Globals (Formen siehe Referenzmaske). */
export function seWindow(): any {
  return globalThis as any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function hostCall(call: () => void): boolean {
  try {
    call()
    return true
  } catch {
    return false
  }
}

export function hasSeData(): boolean {
  const g = seWindow()
  return isObjekt(g.SEDATA) && isObjekt(g.SEDATA.Daten)
}

function tryInitSe(): void {
  const g = seWindow()
  hostCall(() => g.selib?.Json?.InitializeERPConnection?.())
  if (typeof g.InitialisiereSchnittstelle === 'function') hostCall(() => g.InitialisiereSchnittstelle())
}

function refreshDataBase(): void {
  const g = seWindow()
  if (typeof g.ResetDataBasis === 'function') hostCall(() => g.ResetDataBasis())
  if (typeof g.InitialisiereDatenBasis === 'function') hostCall(() => g.InitialisiereDatenBasis())
}

const listeners = new Set<(delivery: boolean) => void>()
const answerListeners = new Set<(raw: unknown) => void>()

const AFTER_RUN_MS = 800

let pending = false
let pendingDelivery = false
let afterRun: ReturnType<typeof setInterval> | null = null

function deepestActive(): Element | null {
  let el: Element | null = document.activeElement
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement
  return el
}

function focusOnUs(): boolean {
  const el = deepestActive()
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable
    || el instanceof HTMLInputElement
    || el instanceof HTMLTextAreaElement
    || el instanceof HTMLSelectElement
}

function afterRunStart(): void {
  if (afterRun !== null) return
  afterRun = setInterval(() => {
    if (focusOnUs()) return
    afterRunBeenden()
    if (!pending) return
    pending = false
    const ran = pendingDelivery
    pendingDelivery = false
    spread(ran)
  }, AFTER_RUN_MS)
}

function afterRunBeenden(): void {
  if (afterRun === null) return
  clearInterval(afterRun)
  afterRun = null
}

export function onSeData(cb: (delivery: boolean) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function onSeAnswer(cb: (raw: unknown) => void): () => void {
  answerListeners.add(cb)
  return () => { answerListeners.delete(cb) }
}

function spread(delivery: boolean): void {
  let complete = true
  listeners.forEach((cb) => {
    try { cb(delivery) } catch { complete = false }
  })
  if (complete && openSignature !== null) lastSignature = openSignature
  openSignature = null
}

function ring(delivery: boolean): void {
  if (delivery) pendingDelivery = true
  if (focusOnUs()) {
    pending = true
    afterRunStart()
    return
  }
  pending = false
  const ran = pendingDelivery
  pendingDelivery = false
  spread(ran)
}

export function reportTrigger(): void {
  ring(false)
}

export function freshDataRequest(): void {
  const g = seWindow()
  const requested = typeof g.ReloadInputJSON === 'function'
    && hostCall(() => g.ReloadInputJSON())
  if (!requested) refreshDataBase()

  pendingDelivery = false
  ring(false)
}

function dataAreNeu(): boolean {
  const g = seWindow()
  const raw = isObjekt(g.SEDATA) ? g.SEDATA.Daten : undefined
  if (!isObjekt(raw)) return false
  const signature = signatureOf(raw)
  if (signature !== '' && signature === lastSignature) return false
  openSignature = signature
  return true
}

function answerRing(raw: unknown): void {
  answerListeners.forEach((cb) => {
    hostCall(() => cb(raw))
  })
}

const SIGNATURE_LIMIT = 2_000_000

let lastSignature = ''
let openSignature: string | null = null

function signatureOf(data: Objekt): string {
  try {
    const raw = JSON.stringify(data)
    return raw.length > SIGNATURE_LIMIT ? '' : raw
  } catch {
    return ''
  }
}

function seConsume(raw: unknown): void {
  const data = dataFromContent(raw)
  if (!data) {
    answerRing(raw)
    return
  }
  const g = seWindow()
  if (!isObjekt(g.SEDATA)) g.SEDATA = {}
  g.SEDATA.Daten = data
  refreshDataBase()

  const signature = signatureOf(data)
  if (signature !== '' && signature === lastSignature) return
  openSignature = signature
  ring(true)
}

function registerSe(tries = 0): void {
  const g = seWindow()
  if (typeof g.basisHTML_REGISTER === 'function') {
    try {
      g.basisHTML_REGISTER((data: unknown) => { seConsume(data) }, document.title, '1.0')
      return
    } catch (error) {
      if (tries >= 400) {
        reportError(
          'SoftEngine-Anmeldung fehlgeschlagen: '
          + (error instanceof Error ? error.message : String(error)),
        )
        return
      }
    }
  }
  if (tries < 400) {
    setTimeout(() => { registerSe(tries + 1) }, 25)
  } else {
    reportError('SoftEngine-Anschluss nicht gefunden — die Maske bleibt ohne Daten.')
  }
}

function focusBridgeBuild(): void {
  seWindow().basisHTML_DoSetFocusToHTML = (): boolean => focusOnUs()
}

let booted = false

export function startSe(): void {
  if (booted) return
  booted = true
  tryInitSe()
  const g = seWindow()

  g.enableCustomFind = false

  g.Erstellen = () => { refreshDataBase(); ring(dataAreNeu()) }
  g.initData = g.Erstellen
  g.ReloadData = () => { ring(dataAreNeu()) }
  focusBridgeBuild()
  startEditingSignal(focusOnUs)
  registerSe()

  window.addEventListener('message', (evt) => {
    if (typeof seWindow().basisHTML_REGISTER === 'function') return
    const payload = messagesContent(evt.data)
    if (payload !== undefined) seConsume(payload)
  }, true)
  let tries = 0
  const poll = setInterval(() => {
    tries += 1
    if (hasSeData()) {
      clearInterval(poll)
      refreshDataBase()
      ring(dataAreNeu())
    } else if (tries > 100) {
      clearInterval(poll)
      reportError('Keine Daten von SoftEngine empfangen — die Maske zeigt nichts an.')
    }
  }, 300)
}
