const NUMBER = /^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$|^-?\d+(,\d+)?$|^-?\d+(\.\d+)?$/

const GROUPED = /^-?[1-9]\d{0,2}(\.\d{3})+$/

// The one reading of a number, in the editor and in the mask: 1.234,5 and
// 1234,5 the German way, 1234.5 as a delivery may hold it.
export function asNumber(value: string): number | null {
  const t = value.trim()
  if (t === '' || !NUMBER.test(t)) return null

  const norm = t.includes(',')
    ? t.replace(/\./g, '').replace(',', '.')
    : GROUPED.test(t) ? t.replace(/\./g, '') : t
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

// The digits after the decimal mark a value brings, read as asNumber reads
// it: 23,62 has two, 1.500 none, 12.5 one.
export function decimalsIn(value: string): number {
  const t = value.trim()
  const mark = t.includes(',') ? ',' : GROUPED.test(t) ? '' : '.'
  const at = mark === '' ? -1 : t.lastIndexOf(mark)
  return at < 0 ? 0 : t.length - at - 1
}

// A number as a value the mask keeps and sends to SoftEngine: no thousands
// point, no trailing zeros. What the mask shows is shownNumber.
export function numberText(value: number, decimals: number): string {
  return value.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, decimals),
  })
}

const SHOWN_DECIMALS_MAX = 20

// A number as the mask shows it: the German way, with the thousands point and
// exactly the digits after the comma asked for. Only for the eye.
export function shownNumber(value: number, decimals: number): string {
  const d = Math.min(Math.max(0, decimals), SHOWN_DECIMALS_MAX)
  return value.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// A value of a column of numbers as the mask shows it: its fixed digits after
// the comma, or with null as many as the value brings. Empty and what is no
// number stay as they are.
export function shownFigure(value: string, decimals: number | null): string {
  const number = asNumber(value)
  return number === null ? value : shownNumber(number, decimals ?? decimalsIn(value))
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** Math.max(0, decimals)
  return Math.round(value * f) / f
}
