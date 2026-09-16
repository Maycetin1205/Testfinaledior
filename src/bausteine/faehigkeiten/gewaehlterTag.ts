// Faehigkeit Gewaehlter Tag: der Tag, den die Maske zeigt, seine vergleichbare
// Form und wer von einem Wechsel erfaehrt.

// SoftEngine liefert TT.MM.JJJJ, der Browser JJJJ-MM-TT: gemessen wird gegen
// den gewaehlten Tag, also in einer Form.
export function tagSchluessel(wert: unknown): string {
  const s = String(wert ?? '').trim()
  if (s === '') return ''
  const deutsch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s)
  if (deutsch) {
    return `${deutsch[3]}-${deutsch[2].padStart(2, '0')}-${deutsch[1].padStart(2, '0')}`
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : ''
}

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
