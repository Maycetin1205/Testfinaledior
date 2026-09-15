// Ein Datum als vergleichbarer Tagesschluessel.
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

export function heuteSchluessel(now: Date): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function tagPlus(schluessel: string, tage: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schluessel)
  if (!m) return ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setDate(d.getDate() + tage)
  return heuteSchluessel(d)
}
