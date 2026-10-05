const NUMBER = /^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$|^-?\d+(,\d+)?$|^-?\d+(\.\d+)?$/

// The one reading of a number, in the editor and in the mask: 1.234,5 and
// 1234,5 the German way, 1234.5 as a delivery may hold it.
export function asNumber(value: string): number | null {
  const t = value.trim()
  if (t === '' || !NUMBER.test(t)) return null

  const norm = t.includes(',')
    ? t.replace(/\./g, '').replace(',', '.')
    : /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

export function numberText(value: number, decimals: number): string {
  return value.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, decimals),
  })
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** Math.max(0, decimals)
  return Math.round(value * f) / f
}
