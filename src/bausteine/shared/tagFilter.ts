// Die Zeilen eines Tages aus einer Quelle heraussuchen.
import { feldLesen } from '../../softengine/data'
import { tagSchluessel } from './datumSchluessel'

export function zeilenAmTag(
  rows: readonly unknown[],
  tagCode: string,
  tag: string,
): unknown[] {
  if (tagCode === '' || tag === '') return [...rows]
  return rows.filter((row) => tagSchluessel(feldLesen(row, tagCode)) === tag)
}
