import { useCallback, useEffect, useState } from 'react'

const KEY = 'aufbau_editor_inspector_abschnitte'

export type SectionName =
  | 'dataSources'
  | 'fields'
  | 'lookupWindow'
  | 'followsSelection'
  | 'actions'

const DEFAULT = false

function read(): Record<string, boolean> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(KEY)
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

let state: Record<string, boolean> | null = null

function all(): Record<string, boolean> {
  if (state === null) state = read()
  return state
}

const listeners = new Set<() => void>()

function set(name: SectionName, open: boolean): void {
  all()[name] = open
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(all()))
    }
  } catch {
    // Browser storage can be blocked; not remembering is no reason to fail.
  }
  for (const report of [...listeners]) report()
}

export function openSection(name: SectionName): void {
  set(name, true)
}

export function useSection(name: SectionName): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState<boolean>(() => all()[name] ?? DEFAULT)

  useEffect(() => {
    const report = (): void => setOpen(all()[name] ?? DEFAULT)
    listeners.add(report)
    report()
    return () => {
      listeners.delete(report)
    }
  }, [name])

  const toggle = useCallback((next: boolean) => set(name, next), [name])

  return [open, toggle]
}
