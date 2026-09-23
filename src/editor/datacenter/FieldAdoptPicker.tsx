import { useMemo, type RefObject } from 'react'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import type { DataSource } from '../../core/data/dataSources'
import {
  adoptFields,
  adoptTables,
  type FieldAdoptTarget,
} from './fieldAdopt'

interface FieldAdoptPickerProps {
  sources: readonly DataSource[]
  target: FieldAdoptTarget

  current: string

  anchor: RefObject<HTMLElement | null>
  onPick: (sourceId: string, code: string) => void
  onClose: () => void
}

const DIVIDER = '::'

export function FieldAdoptPicker({
  sources,
  target,
  current,
  anchor,
  onPick,
  onClose,
}: FieldAdoptPickerProps) {
  const groups: ListGroup[] = useMemo(() => {
    if (target === 'idb') {
      return [{
        key: 'sources',
        name: 'Datenquelle',
        entries: adoptTables(sources)
          .map((source) => ({ value: source.sourceId, name: source.sourceName })),
      }]
    }
    const toSource = new Map<string, ListGroup>()
    for (const field of adoptFields(sources)) {
      let group = toSource.get(field.sourceId)
      if (!group) {
        group = { key: field.sourceId, name: field.sourceName, entries: [] }
        toSource.set(field.sourceId, group)
      }
      ;(group.entries as { value: string; name: string; key: string }[]).push({
        value: `${field.sourceId}${DIVIDER}${field.code}`,
        name: field.label,
        key: field.posLen,
      })
    }
    return [...toSource.values()]
  }, [target, sources])

  const chosen = target === 'field' && current !== ''
    ? groups.flatMap((g) => g.entries).find((e) => e.badge === current)?.value ?? ''
    : ''

  return (
    <Popover
      name={target === 'field' ? 'Feld übernehmen' : 'Tabelle übernehmen'}
      anchor={anchor}
      onClose={onClose}
    >
      <List
        searchable
        groups={groups}
        value={chosen}
        onChoose={(value) => {
          const at = value.indexOf(DIVIDER)
          if (at < 0) onPick(value, '')
          else onPick(value.slice(0, at), value.slice(at + DIVIDER.length))
        }}
      />
    </Popover>
  )
}
