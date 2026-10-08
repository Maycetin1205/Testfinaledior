import { chosenDay, dayOf } from '../../runtime/chosenDay'

// How far the time of a card lies from now, as .vinfo of the reception mask.
export interface Until {
  text: string
  late: boolean
}

// The minute of the day the first time in a text names, like 9:30.
export function minuteOf(text: string): number | null {
  const time = /(?<!\d)(\d{1,2}):(\d{2})(?!\d)/.exec(text)
  if (!time) return null
  const hour = Number(time[1])
  const minute = Number(time[2])
  return hour < 24 && minute < 60 ? hour * 60 + minute : null
}

export const minuteNow = (now: Date): number => now.getHours() * 60 + now.getMinutes()

export const isToday = (now: Date): boolean => chosenDay() === dayOf(now)

export const clockOf = (now: Date): string =>
  now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

// "in 20 min", "vor 1 h 5 min" or "jetzt"; ten hours and more away it says
// nothing.
export function untilOf(minute: number, now: number): Until | null {
  const away = minute - now
  if (away === 0) return { text: 'jetzt', late: false }
  const span = Math.abs(away)
  if (span >= 600) return null
  const rest = span % 60
  const text = span < 60 ? `${span} min` : `${Math.floor(span / 60)} h${rest > 0 ? ` ${rest} min` : ''}`
  return away > 0 ? { text: `in ${text}`, late: false } : { text: `vor ${text}`, late: true }
}
