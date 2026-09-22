import { sourceIdOf } from './source'
import { splitBinding } from '../../core/block/blockType'
import { fieldRead, type RuntimeSource } from '../../softengine/data'
import { runtimeSource, rowsTheSource } from '../../softengine/runtimeSources'
import { firstRowToSelection } from './selection'
import { makeFieldReader } from './foreignSources'

export type BoundSpot =

  | { kind: 'ungebunden' }

  | { kind: 'withoutSource' }

  | { kind: 'withoutRow' }
  | {
    kind: 'value'
    value: string
    row: unknown
    source: RuntimeSource

    sourceId: string
    cleanCode: string
  }

export function readBoundSpot(el: HTMLElement, bindingAttr: string): BoundSpot {
  const ownSource = sourceIdOf(el)
  const code = el.getAttribute(bindingAttr) ?? ''
  if (ownSource === '' || code === '') return { kind: 'ungebunden' }

  const source = runtimeSource(ownSource)
  if (!source) return { kind: 'withoutSource' }

  const row = firstRowToSelection(el, rowsTheSource(source))
  if (row === undefined) return { kind: 'withoutRow' }

  const { sourceId, code: cleanCode } = splitBinding(code)

  const value = sourceId === ''
    ? fieldRead(row, cleanCode)
    : makeFieldReader(el)(row, code)
  return { kind: 'value', value, row, source, sourceId, cleanCode }
}
