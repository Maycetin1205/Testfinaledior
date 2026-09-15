import { WURZEL_ID, type Maskenbaum } from '../../kern/maske/baum'
import { pruefeDatenquellen, type Datenquelle } from '../../kern/daten/datenquellen'
import { pruefeRelationsVorlagen, type RelationsVorlage } from '../../kern/daten/relationen'
import { BEREICH_QUELLEN, BEREICH_RELATIONEN } from '../../kern/daten/ladeProblem'
import { bibliothekPruefen } from './bibliothekDatei'
import { pruefeBaumStand } from './ladeKette'
import { CURRENT_SCHEMA_VERSION, schemaLesbar } from './maskenSchema'
import { meldungen } from './meldungen'
import { kopieSatz, legeKopieAn, meldeSpeicherPanne, merkeSpeicherErfolg, sichereUnlesbaren } from './notfallkopie'

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
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Kein Maskenstand')
    const stand = parsed as Record<string, unknown>
    if (!schemaLesbar(stand.schemaVersion)) {
      const richtung = typeof stand.schemaVersion === 'number' && stand.schemaVersion > CURRENT_SCHEMA_VERSION
        ? 'einer neueren Version' : 'einem nicht unterstützten Format'
      meldungen.melde(`Die gespeicherte Maske stammt aus ${richtung}. Sie wurde nicht geladen. `
        + kopieSatz(STORAGE_KEY, legeKopieAn(STORAGE_KEY, raw)))
      return null
    }
    const baum = pruefeBaumStand({ schemaVersion: stand.schemaVersion, tree: stand.tree, selectedId: stand.selectedId })
    const quellen = bibliothekPruefen(stand.datenquellen, pruefeDatenquellen, BEREICH_QUELLEN)
    const relationen = bibliothekPruefen(stand.relationen, pruefeRelationsVorlagen, BEREICH_RELATIONEN)
    if (baum.art === 'abgelehnt' || !quellen.ok || !relationen.ok) {
      const grund = baum.art === 'abgelehnt' ? baum.probleme[0]?.grund : !quellen.ok ? quellen.grund : !relationen.ok ? relationen.grund : ''
      meldungen.melde(`Die gespeicherte Maske wurde nicht geladen: ${grund ?? 'Aufbau unlesbar'}.`)
      sichereUnlesbaren(STORAGE_KEY, raw, 'Maske')
      return null
    }
    return { ...baum.baum, datenquellen: quellen.liste, relationen: relationen.liste,
      activePageId: typeof stand.activePageId === 'string' ? stand.activePageId : WURZEL_ID }
  } catch {
    sichereUnlesbaren(STORAGE_KEY, raw, 'Maske')
    return null
  }
}

export function persistState(tree: Maskenbaum, selectedId: string | null, bibliotheken: MaskenBibliotheken): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId, ...bibliotheken }))
    merkeSpeicherErfolg(STORAGE_KEY)
  } catch (fehler) { meldeSpeicherPanne(STORAGE_KEY, 'Maske', fehler) }
}
