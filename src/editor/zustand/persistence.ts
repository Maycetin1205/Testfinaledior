import { WURZEL_ID, type Maskenbaum } from '../../kern/maske/baum'
import { pruefeDatenquellen, type Datenquelle } from '../../kern/daten/datenquellen'
import { pruefeRelationsVorlagen, type RelationsVorlage } from '../../kern/daten/relationen'
import { BEREICH_QUELLEN, BEREICH_RELATIONEN } from '../../kern/daten/ladeProblem'
import { bibliothekPruefen } from './bibliothekDatei'
import type { Editor } from './Editor'
import { pruefeBaumStand } from './ladeKette'
import { CURRENT_SCHEMA_VERSION, hebeStand, schemaLesbar } from './maskenSchema'
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
  if (!raw) return null
  return leseStand(raw, STORAGE_KEY)
}

// Ein gespeicherter Stand als Text, gepruefte Maske zurueck. Was nicht lesbar
// ist, wird gemeldet und unter dem genannten Schluessel gesichert.
export function leseStand(raw: string, storageKey: string): LoadedState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Kein Maskenstand')
    const stand = hebeStand(parsed) as Record<string, unknown>
    if (!schemaLesbar(stand.schemaVersion)) {
      const richtung = typeof stand.schemaVersion === 'number' && stand.schemaVersion > CURRENT_SCHEMA_VERSION
        ? 'einer neueren Version' : 'einem nicht unterstützten Format'
      meldungen.melde(`Die gespeicherte Maske stammt aus ${richtung}. Sie wurde nicht geladen. `
        + kopieSatz(storageKey, legeKopieAn(storageKey, raw)))
      return null
    }
    const baum = pruefeBaumStand({ schemaVersion: stand.schemaVersion, tree: stand.tree, selectedId: stand.selectedId })
    const quellen = bibliothekPruefen(stand.datenquellen, pruefeDatenquellen, BEREICH_QUELLEN)
    const relationen = bibliothekPruefen(stand.relationen, pruefeRelationsVorlagen, BEREICH_RELATIONEN)
    if (baum.art === 'abgelehnt' || !quellen.ok || !relationen.ok) {
      const grund = baum.art === 'abgelehnt' ? baum.probleme[0]?.grund : !quellen.ok ? quellen.grund : !relationen.ok ? relationen.grund : ''
      meldungen.melde(`Die gespeicherte Maske wurde nicht geladen: ${grund ?? 'Aufbau unlesbar'}.`)
      sichereUnlesbaren(storageKey, raw, 'Maske')
      return null
    }
    meldeEntfallene(baum.entfallen)
    return { ...baum.baum, datenquellen: quellen.liste, relationen: relationen.liste,
      activePageId: typeof stand.activePageId === 'string' ? stand.activePageId : WURZEL_ID }
  } catch {
    sichereUnlesbaren(storageKey, raw, 'Maske')
    return null
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

export function persistState(tree: Maskenbaum, selectedId: string | null, bibliotheken: MaskenBibliotheken): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId, ...bibliotheken }))
    merkeSpeicherErfolg(STORAGE_KEY)
  } catch (fehler) { meldeSpeicherPanne(STORAGE_KEY, 'Maske', fehler) }
}
