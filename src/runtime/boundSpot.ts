import { sourceIdOf } from './source'
import { splitBinding } from '../core/block/blockType'
import type { RuntimeSource } from '../core/data/dataSources'
import { maskState } from './maskState'
import { firstRowToSelection } from './selection'
import { makeFieldReader } from './foreignSources'

export type BoundSpot =

  | { kind: 'unbound' }

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
  if (ownSource === '' || code === '') return { kind: 'unbound' }

  const host = maskState.host
  const source = host.source(ownSource)
  if (!source) return { kind: 'withoutSource' }

  const row = firstRowToSelection(el, host.rows(source))
  if (row === undefined) return { kind: 'withoutRow' }

  const { sourceId, code: cleanCode } = splitBinding(code)

  const value = sourceId === ''
    ? host.readField(row, cleanCode)
    : makeFieldReader(el)(row, code)
  return { kind: 'value', value, row, source, sourceId, cleanCode }
}
