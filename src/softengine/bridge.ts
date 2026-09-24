import { isObject, messagesContent, dataFromContent, type JsonObject } from './data'

/* eslint-disable @typescript-eslint/no-explicit-any -- SEDATA and selib are
   untyped globals of the SoftEngine host. */
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
  return isObject(g.SEDATA) && isObject(g.SEDATA.Daten)
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

interface BridgeState {
  listeners: Set<(delivery: boolean) => void>
  answerListeners: Set<(raw: unknown) => void>
  pending: boolean
  pendingDelivery: boolean
  afterRun: ReturnType<typeof setInterval> | null
  lastSignature: string
  openSignature: string | null
  booted: boolean
}

const bridge: BridgeState = {
  listeners: new Set(),
  answerListeners: new Set(),
  pending: false,
  pendingDelivery: false,
  afterRun: null,
  lastSignature: '',
  openSignature: null,
  booted: false,
}

const AFTER_RUN_MS = 800

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
  if (bridge.afterRun !== null) return
  bridge.afterRun = setInterval(() => {
    if (focusOnUs()) return
    afterRunStop()
    if (!bridge.pending) return
    bridge.pending = false
    const ran = bridge.pendingDelivery
    bridge.pendingDelivery = false
    spread(ran)
  }, AFTER_RUN_MS)
}

function afterRunStop(): void {
  if (bridge.afterRun === null) return
  clearInterval(bridge.afterRun)
  bridge.afterRun = null
}

export function onSeData(cb: (delivery: boolean) => void): () => void {
  bridge.listeners.add(cb)
  return () => { bridge.listeners.delete(cb) }
}

export function onSeAnswer(cb: (raw: unknown) => void): () => void {
  bridge.answerListeners.add(cb)
  return () => { bridge.answerListeners.delete(cb) }
}

function spread(delivery: boolean): void {
  let complete = true
  bridge.listeners.forEach((cb) => {
    try { cb(delivery) } catch { complete = false }
  })
  if (complete && bridge.openSignature !== null) bridge.lastSignature = bridge.openSignature
  bridge.openSignature = null
}

function ring(delivery: boolean): void {
  if (delivery) bridge.pendingDelivery = true
  if (focusOnUs()) {
    bridge.pending = true
    afterRunStart()
    return
  }
  bridge.pending = false
  const ran = bridge.pendingDelivery
  bridge.pendingDelivery = false
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

  bridge.pendingDelivery = false
  ring(false)
}

function dataAreNew(): boolean {
  const g = seWindow()
  const raw = isObject(g.SEDATA) ? g.SEDATA.Daten : undefined
  if (!isObject(raw)) return false
  const signature = signatureOf(raw)
  if (signature !== '' && signature === bridge.lastSignature) return false
  bridge.openSignature = signature
  return true
}

function answerRing(raw: unknown): void {
  bridge.answerListeners.forEach((cb) => {
    hostCall(() => cb(raw))
  })
}

const SIGNATURE_LIMIT = 2_000_000

function signatureOf(data: JsonObject): string {
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
  if (!isObject(g.SEDATA)) g.SEDATA = {}
  g.SEDATA.Daten = data
  refreshDataBase()

  const signature = signatureOf(data)
  if (signature !== '' && signature === bridge.lastSignature) return
  bridge.openSignature = signature
  ring(true)
}

function registerSe(tries = 0): void {
  const g = seWindow()
  if (typeof g.basisHTML_REGISTER === 'function') {
    try {
      g.basisHTML_REGISTER((data: unknown) => { seConsume(data) }, document.title, '1.0')
      return
    } catch {
      if (tries >= 400) return
    }
  }
  if (tries < 400) setTimeout(() => { registerSe(tries + 1) }, 25)
}

function buildFocusBridge(): void {
  seWindow().basisHTML_DoSetFocusToHTML = (): boolean => focusOnUs()
}

export function startSe(): void {
  if (bridge.booted) return
  bridge.booted = true
  tryInitSe()
  const g = seWindow()

  g.enableCustomFind = false

  g.Erstellen = () => { refreshDataBase(); ring(dataAreNew()) }
  g.initData = g.Erstellen
  g.ReloadData = () => { ring(dataAreNew()) }
  buildFocusBridge()
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
      ring(dataAreNew())
    } else if (tries > 100) {
      clearInterval(poll)
    }
  }, 300)
}
