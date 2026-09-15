// Die Bruecke zu SoftEngine: anmelden, Pushes annehmen, den Datenstand verteilen.
import { istObjekt, nachrichtenInhalt, datenAusInhalt, type Objekt } from './data'

import { meldeFehler } from './meldung'

/* eslint-disable @typescript-eslint/no-explicit-any -- SEDATA/selib sind
   fremde, untypisierte SoftEngine-Globals (Formen siehe Referenzmaske). */
export function seFenster(): any {
  return globalThis as any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function hatSeDaten(): boolean {
  const g = seFenster()
  return istObjekt(g.SEDATA) && istObjekt(g.SEDATA.Daten)
}

function tryInitSe(): void {
  const g = seFenster()
  try { g.selib?.Json?.InitializeERPConnection?.() } catch { /* nicht in SE */ }
  try { if (typeof g.InitialisiereSchnittstelle === 'function') g.InitialisiereSchnittstelle() } catch { /* s.o. */ }
}

function refreshDataBasis(): void {
  const g = seFenster()
  try { if (typeof g.ResetDataBasis === 'function') g.ResetDataBasis() } catch { /* nicht in SE */ }
  try { if (typeof g.InitialisiereDatenBasis === 'function') g.InitialisiereDatenBasis() } catch { /* s.o. */ }
}

// Der Schalter sagt, ob wirklich NEUE Daten da sind. Nur dann darf eine
// geschriebene Zeile aus der Maske verschwinden.
const zuhoerer = new Set<(lieferung: boolean) => void>()
const antwortZuhoerer = new Set<(raw: unknown) => void>()

// Die ERP schiebt weiter, waehrend der Bediener tippt; zeichnete die Maske dabei
// neu, spraenge ihm die Schreibmarke aus der Zelle (kontrakte.md 16).
const NACHLAUF_MS = 800

let ausstehend = false
let ausstehendeLieferung = false
let nachlauf: ReturnType<typeof setInterval> | null = null

// Das wirklich fokussierte Element, durch die Schatten-Wurzeln hindurch.
function tiefstesAktives(): Element | null {
  let el: Element | null = document.activeElement
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement
  return el
}

function fokusBeiUns(): boolean {
  const el = tiefstesAktives()
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable
    || el instanceof HTMLInputElement
    || el instanceof HTMLTextAreaElement
    || el instanceof HTMLSelectElement
}

function nachlaufStarten(): void {
  if (nachlauf !== null) return
  nachlauf = setInterval(() => {
    if (fokusBeiUns()) return
    nachlaufBeenden()
    if (!ausstehend) return
    ausstehend = false
    const lief = ausstehendeLieferung
    ausstehendeLieferung = false
    verteile(lief)
  }, NACHLAUF_MS)
}

function nachlaufBeenden(): void {
  if (nachlauf === null) return
  clearInterval(nachlauf)
  nachlauf = null
}

export function onSeDaten(cb: (lieferung: boolean) => void): () => void {
  zuhoerer.add(cb)
  return () => { zuhoerer.delete(cb) }
}

export function onSeAntwort(cb: (raw: unknown) => void): () => void {
  antwortZuhoerer.add(cb)
  return () => { antwortZuhoerer.delete(cb) }
}

// Ein werfender Baustein darf weder die uebrigen Zuhoerer abschneiden noch den
// Empfang stilllegen. Bleibt die Signatur ungesetzt, wird derselbe Stand beim
// naechsten Schub noch einmal verteilt.
function verteile(lieferung: boolean): void {
  let vollstaendig = true
  zuhoerer.forEach((cb) => {
    try { cb(lieferung) } catch { vollstaendig = false }
  })
  if (vollstaendig && offeneSignatur !== null) letzteSignatur = offeneSignatur
  offeneSignatur = null
}

function klingeln(lieferung: boolean): void {
  if (lieferung) ausstehendeLieferung = true
  if (fokusBeiUns()) {
    ausstehend = true
    nachlaufStarten()
    return
  }
  ausstehend = false
  const lief = ausstehendeLieferung
  ausstehendeLieferung = false
  verteile(lief)
}

// Anstoss OHNE Lieferungs-Beweis: die Maske zeichnet neu, aber kein Baustein
// darf daran etwas verwerfen.
export function meldeAnstoss(): void {
  klingeln(false)
}

// Nach dem Schreiben will der Bediener den neuen Stand sehen. Nachliefern kann
// nur SoftEngine selbst: ReloadInputJSON holt die Eingabedatei neu, der
// Modul-Lebenszyklus leert bloss die eigene Seite (kontrakte.md 7).
export function frischeDatenAnfordern(): void {
  const g = seFenster()
  let angefordert = false
  try {
    if (typeof g.ReloadInputJSON === 'function') {
      g.ReloadInputJSON()
      angefordert = true
    }
  } catch { /* nicht in SE */ }
  if (!angefordert) refreshDataBasis()
  // Ein Stand, der schon vor dem Schreiben hereinkam, kann die eben gesendete
  // Zeile nicht enthalten: als Beweis taugt er nicht, sonst hiesse es „nicht
  // angekommen", bevor die ERP ueberhaupt geantwortet hat.
  ausstehendeLieferung = false
  klingeln(false)
}

// „Sind das andere Daten als zuletzt?" — dieselbe Signatur wie im Push-Weg.
// SoftEngine ruft auch dann, wenn sich nichts geaendert hat, und daran darf keine
// hinausgeschickte Zeile verschwinden.
function datenSindNeu(): boolean {
  const g = seFenster()
  const roh = istObjekt(g.SEDATA) ? g.SEDATA.Daten : undefined
  if (!istObjekt(roh)) return false
  const signatur = signaturVon(roh)
  if (signatur !== '' && signatur === letzteSignatur) return false
  offeneSignatur = signatur
  return true
}

function antwortKlingeln(raw: unknown): void {
  antwortZuhoerer.forEach((cb) => {
    try { cb(raw) } catch { /* ein Konsument darf den Empfang nie stoppen */ }
  })
}

// Jeder Push traegt den ganzen Datenstand. Sehr grosse Staende werden nicht
// signiert, der Vergleich kostete mehr als das Neuzeichnen: eine leere Signatur
// heisst unbekannt und zeichnet immer.
const SIGNATUR_GRENZE = 2_000_000

let letzteSignatur = ''
let offeneSignatur: string | null = null

function signaturVon(daten: Objekt): string {
  try {
    const roh = JSON.stringify(daten)
    return roh.length > SIGNATUR_GRENZE ? '' : roh
  } catch {
    return ''
  }
}

function seConsume(raw: unknown): void {
  const daten = datenAusInhalt(raw)
  if (!daten) {
    antwortKlingeln(raw)
    return
  }
  const g = seFenster()
  if (!istObjekt(g.SEDATA)) g.SEDATA = {}
  g.SEDATA.Daten = daten
  refreshDataBasis()

  const signatur = signaturVon(daten)
  if (signatur !== '' && signatur === letzteSignatur) return
  offeneSignatur = signatur
  klingeln(true)
}

function registerSe(tries = 0): void {
  const g = seFenster()
  if (typeof g.basisHTML_REGISTER === 'function') {
    try {
      g.basisHTML_REGISTER((data: unknown) => { seConsume(data) }, document.title, '1.0')
      return
    } catch (error) {
      // Die Funktion ist da, das Interface noch nicht bereit: weiter versuchen,
      // aufgeben hiesse eine Maske ohne Daten.
      if (tries >= 400) {
        meldeFehler(
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
    meldeFehler('SoftEngine-Anschluss nicht gefunden — die Maske bleibt ohne Daten.')
  }
}

// Echttest 15.09.: der Klick setzt die Schreibmarke, sie verschwindet gleich
// wieder. Genau das tut SoftEngines Auto-Fokus — er entfernt sein Hilfsfeld
// wieder, danach haelt nichts mehr den Fokus (kontrakte.md 13).
function fokusBrueckeBauen(): void {
  bruecke()
  // Ein spaeter geladenes SoftEngine-Skript erklaert beide Funktionen neu und
  // waere damit wieder die alte Fassung; darum vor jedem Klick noch einmal.
  document.addEventListener('pointerdown', () => { bruecke(); tastaturHolen() }, true)
}

function bruecke(): void {
  const wirt = seFenster()
  wirt.basisHTML_DoSetFocusToHTML = (): boolean => { tastaturHolen(); return true }
  wirt.basis_HTML_DoSetAutoFocus = (): void => { autoFokusOhneVerlust() }
}

// Die Tastatur hat der Wirt, nicht das Dokument; eine Seite kann ihn nur danach
// fragen. Ein Fokuswechsel im HTML holt sie nicht (Echttest 15.09.).
function tastaturHolen(): void {
  window.focus()
  try { if (window.top !== null && window.top !== window) window.top.focus() } catch { /* fremder Ursprung */ }
}

// Falls SoftEngines Auto-Fokus doch gerufen wird: derselbe Zweck, aber das Feld
// behaelt die Schreibmarke.
function autoFokusOhneVerlust(): void {
  const vorher = tiefstesAktives()
  tastaturHolen()
  if (vorher instanceof HTMLElement) vorher.focus()
}

// NUR FUER DIE FEHLERSUCHE 15.09., kommt nach dem Echttest wieder raus: sagt in
// der Konsole, wer die Schreibmarke nimmt und ob Tasten die Maske erreichen.
function fehlersucheFokus(): void {
  const wo = (el: unknown): string => (el instanceof HTMLElement ? `${el.nodeName}#${el.id || '-'}` : String(el))
  const stand = (): string => `hasFocus=${document.hasFocus()} aktiv=${wo(tiefstesAktives())}`
  console.log(`[fokus] Maske bereit, imRahmen=${window.top !== window} ${stand()}`)

  const alt = seFenster().basisHTML_DoSetFocusToHTML as (() => boolean) | undefined
  seFenster().basisHTML_DoSetFocusToHTML = (): boolean => {
    console.log(`[fokus] WWFOC vom Wirt, ${stand()}`)
    return alt ? alt() : true
  }
  const altAuto = seFenster().basis_HTML_DoSetAutoFocus as (() => void) | undefined
  seFenster().basis_HTML_DoSetAutoFocus = (): void => {
    console.log(`[fokus] Auto-Fokus gerufen, ${stand()}`)
    altAuto?.()
  }

  window.addEventListener('keydown', (e) => { console.log(`[fokus] Taste "${e.key}" kommt an, ${stand()}`) }, true)
  window.addEventListener('focusin', (e) => { console.log(`[fokus] + ${wo(e.target)}`) }, true)
  window.addEventListener('focusout', (e) => { console.log(`[fokus] - ${wo(e.target)} -> ${wo(document.activeElement)}`) }, true)
  if (document.body) {
    new MutationObserver((listen) => {
      for (const l of listen) {
        for (const k of l.addedNodes) if (k instanceof HTMLElement && k.id === 'AFELM') console.log('[fokus] SoftEngines eigenes AFELM ist da — seine Fassung laeuft, nicht unsere')
      }
    }).observe(document.body, { childList: true })
  }
}

let booted = false

export function starteSe(): void {
  if (booted) return
  booted = true
  tryInitSe()
  const g = seFenster()

  // SoftEngines eigene Suche (Strg+F) durchsucht keine Schatten-Wurzeln und
  // meldet an jeder Maske "0 / 0".
  g.enableCustomFind = false

  g.Erstellen = () => { refreshDataBasis(); klingeln(datenSindNeu()) }
  g.initData = g.Erstellen
  g.ReloadData = () => { klingeln(datenSindNeu()) }
  fokusBrueckeBauen()
  fehlersucheFokus()
  registerSe()

  window.addEventListener('message', (evt) => {
    if (typeof seFenster().basisHTML_REGISTER === 'function') return
    const payload = nachrichtenInhalt(evt.data)
    if (payload !== undefined) seConsume(payload)
  }, true)
  let tries = 0
  const poll = setInterval(() => {
    tries += 1
    if (hatSeDaten()) {
      clearInterval(poll)
      refreshDataBasis()
      klingeln(datenSindNeu())
    } else if (tries > 100) {
      clearInterval(poll)
      meldeFehler('Keine Daten von SoftEngine empfangen — die Maske zeigt nichts an.')
    }
  }, 300)
}
