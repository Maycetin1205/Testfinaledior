import type { Delivery } from '../../core/block/capability'
import { numberStrict } from '../../core/data/calculation'
import type { Column } from './columns'

export interface SentRow {
  record: string

  values: readonly string[]
}

export function valueEquals(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x === y) return true
  const zx = numberStrict(x)
  return zx !== null && zx === numberStrict(y)
}

export function arrivalCheck(
  sent: readonly SentRow[],
  columns: readonly Column[],
  delivery: Delivery,
): boolean[] {
  const free = delivery.rows.map(() => true)
  const arrived = sent.map(() => false)

  const take = (slot: number, i: number): boolean => {
    if (slot === -1) return false
    free[slot] = false
    arrived[i] = true
    return true
  }

  sent.forEach((row, i) => {
    if (row.record === '') return
    take(delivery.rows.findIndex(
      (z, k) => free[k] && valueEquals(delivery.recordOf(z), row.record),
    ), i)
  })

  const fields = columns
    .map((s, slot) => ({ slot, field: s.field }))
    .filter((s) => s.field !== '')

  sent.forEach((row, i) => {
    if (row.record !== '') return
    const checkable = fields.filter((f) => (row.values[f.slot] ?? '').trim() !== '')

    if (checkable.length === 0) {
      arrived[i] = true
      return
    }
    take(delivery.rows.findIndex((z, k) => free[k]
      && checkable.every((f) => valueEquals(delivery.read(z, f.field), row.values[f.slot] ?? ''))), i)
  })

  return arrived
}

export function changeArrived(
  record: string,
  changed: readonly { field: string; before: string }[],
  delivery: Delivery,
): boolean {
  const row = delivery.rows.find((z) => valueEquals(delivery.recordOf(z), record))

  if (row === undefined) return true

  if (changed.length === 0) return true
  return changed.every((f) => !valueEquals(delivery.read(row, f.field), f.before))
}

export function deletionArrived(record: string, delivery: Delivery): boolean {
  return !delivery.rows.some((z) => valueEquals(delivery.recordOf(z), record))
}

export interface MissingRow {
  nr: string

  item: string
}

const AT_MOST = 3

function enumeration(
  missing: readonly MissingRow[],
  singular: string,
  plural: string,
): string {
  if (missing.length === 0) return ''
  const names = missing.slice(0, AT_MOST)
    .map((f) => 'Position ' + f.nr + (f.item === '' ? '' : ' (' + f.item + ')'))
  const rest = missing.length - names.length
  return names.join(', ')
    + (rest > 0 ? ' und ' + String(rest) + ' weitere' : '')
    + ' ' + (missing.length === 1 ? singular : plural)
}

export function missingMessage(missing: readonly MissingRow[]): string {
  return enumeration(
    missing,
    'ist nicht im Beleg angekommen.',
    'sind nicht im Beleg angekommen.',
  )
}

export function notChangedMessage(missing: readonly MissingRow[]): string {
  return enumeration(
    missing,
    'ist im Beleg unverändert geblieben.',
    'sind im Beleg unverändert geblieben.',
  )
}

export function notDeletedMessage(missing: readonly MissingRow[]): string {
  return enumeration(missing, 'steht noch im Beleg.', 'stehen noch im Beleg.')
}
