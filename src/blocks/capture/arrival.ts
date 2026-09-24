import type { Delivery } from '../../core/block/capability'
import { numberStrict } from '../../core/data/calculation'
import type { Column } from '../list/columns'

interface SentRow {
  record: string

  values: readonly string[]
}

export function valueEquals(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x === y) return true
  const number = numberStrict(x)
  return number !== null && number === numberStrict(y)
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
