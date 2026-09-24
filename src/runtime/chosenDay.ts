import { maskState } from './maskState'

// d.m.yyyy, d.m.yy or yyyy-mm-dd at the start of the text, a time may follow.
export function readDate(value: unknown): Date | null {
  const text = String(value ?? '').trim()
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/.exec(text)
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(text)
  let year: number
  let month: number
  let day: number
  if (german) {
    const short = Number(german[3])
    year = german[3].length === 2 ? (short <= 69 ? 2000 + short : 1900 + short) : short
    month = Number(german[2])
    day = Number(german[1])
  } else if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else {
    return null
  }
  const date = new Date(year, month - 1, day)
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return real ? date : null
}

export function dayOf(moment: Date): string {
  const month = String(moment.getMonth() + 1).padStart(2, '0')
  const day = String(moment.getDate()).padStart(2, '0')
  return `${moment.getFullYear()}-${month}-${day}`
}

export function dayKey(value: unknown): string {
  const date = readDate(value)
  return date ? dayOf(date) : ''
}

export function chosenDay(): string {
  return maskState.chosenDay.day
}

export function setChosenDay(value: unknown): void {
  const next = dayKey(value)
  const chosen = maskState.chosenDay
  if (next === chosen.day) return
  chosen.day = next
  chosen.listeners.forEach((cb) => cb())
}

export function onChosenDay(cb: () => void): () => void {
  const listeners = maskState.chosenDay.listeners
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
