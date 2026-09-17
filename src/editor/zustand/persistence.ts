import { WURZEL_ID, type Maskenbaum } from '../../kern/maske/baum'
import { leererBaum } from '../../kern/maske/baumOps'
import { pruefeDatenquellen, type Datenquelle } from '../../kern/daten/datenquellen'
import { pruefeRelationsVorlagen, type RelationsVorlage } from '../../kern/daten/relationen'
import { BEREICH_QUELLEN, BEREICH_RELATIONEN } from '../../kern/daten/ladeProblem'
import {
  bibliothekPruefen,
  packeBibliothek,
  packeBibliothekAus,
  type BibliothekInhalt,
} from './bibliothekDatei'
import type { Editor } from './Editor'
import { pruefeBaumStand } from './ladeKette'
import { CURRENT_SCHEMA_VERSION, hebeSchluessel, hebeStand, schemaLesbar } from './maskenSchema'
import { meldungen } from './meldungen'
import {
  kopieSatz,
  legeKopieAn,
  letzteKopie,
  meldeSpeicherPanne,
  merkeSpeicherErfolg,
  sichereUnlesbaren,
} from './notfallkopie'

export const STORAGE_KEY = 'aufbau_editor_mvp_v1'
// Das Datencenter fuer sich, neben der Maske.
export const BIBLIOTHEK_KEY = 'aufbau_editor_datencenter'
export const SAVE_DEBOUNCE_MS = 500

interface MaskenBibliotheken {
  datenquellen: readonly Datenquelle[]
  relationen: readonly RelationsVorlage[]
  activePageId: string
}
export interface LoadedState extends MaskenBibliotheken {
  tree: Maskenbaum
  selectedId: string | null
}

export function loadFromStorage(): LoadedState | null {
  let raw: string | null
  try { raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY) }
  catch { meldungen.melde('Die gespeicherte Maske konnte nicht aus dem Browser-Speicher gelesen werden.'); return null }
  return mitGesichertemDatencenter(raw ? leseStand(raw, STORAGE_KEY) : null)
}

// Was im eigenen Schluessel liegt, als Bibliotheksdatei gelesen.
function gesichertesDatencenter(): BibliothekInhalt | null {
  let roh: string | null
  try { roh = typeof localStorage === 'undefined' ? null : localStorage.getItem(BIBLIOTHEK_KEY) }
  catch { return null }
  if (!roh) return null
  const ergebnis = packeBibliothekAus(roh)
  if (!ergebnis.ok) return null
  const { datenquellen, relationen } = ergebnis.inhalt
  return datenquellen.length === 0 && relationen.length === 0 ? null : ergebnis.inhalt
}

// Der Maskenstand gilt, solange er ein Datencenter mitbringt. Bringt er keins
// — weil die Maske nicht las oder der Speicher sie verlor —, kommt es aus
// seinem eigenen Schluessel zurueck.
function mitGesichertemDatencenter(stand: LoadedState | null): LoadedState | null {
  if (stand && (stand.datenquellen.length > 0 || stand.relationen.length > 0)) return stand
  const gesichert = gesichertesDatencenter()
  if (!gesichert) return stand
  meldungen.melde(
    `Das Datencenter kommt aus seiner eigenen Sicherung: ${gesichert.datenquellen.length} `
    + `Datenquelle(n) und ${gesichert.relationen.length} Relation(en).`,
    'hinweis',
  )
  return {
    tree: stand?.tree ?? leererBaum(),
    selectedId: stand?.selectedId ?? null,
    datenquellen: gesichert.datenquellen,
    relationen: gesichert.relationen,
    activePageId: stand?.activePageId ?? WURZEL_ID,
  }
}

// Das Datencenter haengt nicht am Maskenformat: seine Eintraege stehen fuer
// sich und sind die Arbeit vieler Tage. Was von ihnen lesbar ist, kommt auch
// dann zurueck, wenn die Maske abgelehnt wird — sonst nimmt eine unlesbare
// Maske die Datenquellen mit, die nie kaputt waren.
function geretteteBibliothek(roh: unknown): LoadedState | null {
  const stand = hebeSchluessel(roh) as Record<string, unknown>
  const quellen = bibliothekPruefen(stand.datenquellen, pruefeDatenquellen, BEREICH_QUELLEN)
  const relationen = bibliothekPruefen(stand.relationen, pruefeRelationsVorlagen, BEREICH_RELATIONEN)
  if (!quellen.ok && !relationen.ok) return null
  const datenquellen = quellen.ok ? quellen.liste : []
  const vorlagen = relationen.ok ? relationen.liste : []
  if (datenquellen.length === 0 && vorlagen.length === 0) return null
  meldungen.melde(
    `Das Datencenter ist gerettet: ${datenquellen.length} Datenquelle(n) und `
    + `${vorlagen.length} Relation(en) sind geladen. Sichere sie im Datencenter mit `
    + '„Bibliothek speichern" als Datei, dann hängen sie an keiner Maske mehr.',
    'hinweis',
  )
  return {
    tree: leererBaum(),
    selectedId: null,
    datenquellen,
    relationen: vorlagen,
    activePageId: WURZEL_ID,
  }
}

// Ein gespeicherter Stand als Text, gepruefte Maske zurueck. Was nicht lesbar
// ist, wird gemeldet und unter dem genannten Schluessel gesichert; das
// Datencenter wird dabei gerettet.
export function leseStand(raw: string, storageKey: string): LoadedState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Kein Maskenstand')
  } catch {
    sichereUnlesbaren(storageKey, raw, 'Maske')
    return null
  }
  try {
    const stand = hebeStand(parsed) as Record<string, unknown>
    if (!schemaLesbar(stand.schemaVersion)) {
      const richtung = typeof stand.schemaVersion === 'number' && stand.schemaVersion > CURRENT_SCHEMA_VERSION
        ? 'einer neueren Version' : 'einem nicht unterstützten Format'
      meldungen.melde(`Die gespeicherte Maske stammt aus ${richtung}. Sie wurde nicht geladen. `
        + kopieSatz(storageKey, legeKopieAn(storageKey, raw)))
      return geretteteBibliothek(parsed)
    }
    const baum = pruefeBaumStand({ schemaVersion: stand.schemaVersion, tree: stand.tree, selectedId: stand.selectedId })
    const quellen = bibliothekPruefen(stand.datenquellen, pruefeDatenquellen, BEREICH_QUELLEN)
    const relationen = bibliothekPruefen(stand.relationen, pruefeRelationsVorlagen, BEREICH_RELATIONEN)
    if (baum.art === 'abgelehnt' || !quellen.ok || !relationen.ok) {
      const grund = baum.art === 'abgelehnt' ? baum.probleme[0]?.grund : !quellen.ok ? quellen.grund : !relationen.ok ? relationen.grund : ''
      meldungen.melde(`Die gespeicherte Maske wurde nicht geladen: ${grund ?? 'Aufbau unlesbar'}.`)
      sichereUnlesbaren(storageKey, raw, 'Maske')
      return geretteteBibliothek(parsed)
    }
    meldeEntfallene(baum.entfallen)
    return { ...baum.baum, datenquellen: quellen.liste, relationen: relationen.liste,
      activePageId: typeof stand.activePageId === 'string' ? stand.activePageId : WURZEL_ID }
  } catch {
    sichereUnlesbaren(storageKey, raw, 'Maske')
    return geretteteBibliothek(parsed)
  }
}

export function meldeEntfallene(entfallen: readonly string[]): void {
  if (entfallen.length === 0) return
  const arten = [...new Set(entfallen)].map((t) => `„${t}"`).join(', ')
  meldungen.melde(`${entfallen.length} Baustein(e) vom Typ ${arten} gibt es nicht mehr und wurden weggelassen. Alles andere ist geladen.`)
}

// Die juengste Notfallkopie zurueck in den Editor, als ein Undo-Schritt. Die
// Kopie selbst bleibt liegen, bis sie bewusst entfernt wird.
export function stelleLetzteKopieWiederHer(editor: Editor): void {
  const kopie = letzteKopie(STORAGE_KEY)
  if (kopie === null) {
    meldungen.melde('Es gibt keine Notfallkopie im Browser-Speicher.')
    return
  }
  const stand = leseStand(kopie.raw, STORAGE_KEY)
  if (stand === null) return
  editor.ersetzeMaske({
    tree: stand.tree,
    datenquellen: [...stand.datenquellen],
    relationen: [...stand.relationen],
  })
  meldungen.melde(`Notfallkopie „${kopie.key}" wiederhergestellt. Strg+Z nimmt es zurück.`)
}

export function persistState(
  tree: Maskenbaum,
  selectedId: string | null,
  bibliotheken: MaskenBibliotheken,
  datencenterVonHandGeaendert = false,
): void {
  sichereDatencenter(bibliotheken, datencenterVonHandGeaendert)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId, ...bibliotheken }))
    merkeSpeicherErfolg(STORAGE_KEY)
  } catch (fehler) { meldeSpeicherPanne(STORAGE_KEY, 'Maske', fehler) }
}

// Das Datencenter zusaetzlich fuer sich, im Format der Bibliotheksdatei: es
// ueberlebt so jede Maske, und der Schluessel laesst sich unveraendert als
// Datei sichern. Eine Panne meldet schon der Maskenstand daneben.
//
// Aermer werden darf die Sicherung nur durch den Nutzer: kam der Editor ohne
// Datenquellen hoch, schrieb frueher die erste Aenderung an der Maske die
// leere Liste darueber. Ohne Handschlag schreibt sie nur, was nichts nimmt.
function sichereDatencenter(bibliotheken: MaskenBibliotheken, vonHandGeaendert: boolean): void {
  if (!vonHandGeaendert && gesichertesDatencenter() !== null) return
  try {
    localStorage.setItem(BIBLIOTHEK_KEY, packeBibliothek({
      datenquellen: [...bibliotheken.datenquellen],
      relationen: [...bibliotheken.relationen],
    }))
  } catch { /* der Maskenstand meldet die volle Ablage */ }
}
