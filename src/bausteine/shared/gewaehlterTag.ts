// Der Tag, den die Maske gerade zeigt, und wer davon erfaehrt.
import { tagSchluessel } from './datumSchluessel'

let tag = ''
const horcher = new Set<() => void>()

export function gewaehlterTag(): string {
  return tag
}

export function setzeGewaehltenTag(wert: unknown): void {
  const neu = tagSchluessel(wert)
  if (neu === tag) return
  tag = neu
  horcher.forEach((cb) => cb())
}

export function aufTagHoeren(cb: () => void): () => void {
  horcher.add(cb)
  return () => { horcher.delete(cb) }
}

