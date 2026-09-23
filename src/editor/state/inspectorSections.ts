import { readMoved } from './maskStorage'

const KEY = 'aufbau_editor_inspector_sections'

const FORMER_KEY = 'aufbau_editor_inspector_abschnitte'

export type SectionName =
  | 'dataSources'
  | 'fields'
  | 'lookupWindow'
  | 'followsSelection'
  | 'actions'

export function readSections(): Record<string, boolean> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = readMoved(KEY, FORMER_KEY)
    if (raw === null) return {}
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

    const state: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'boolean') state[k] = v
    }
    return state
  } catch {
    return {}
  }
}

export function writeSections(state: Record<string, boolean>): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Browser storage can be blocked; not remembering is no reason to fail.
  }
}
