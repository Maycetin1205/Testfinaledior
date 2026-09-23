import { useState } from 'react'
import { Search, Share2 } from '@/editor/icons/icon'
import { Entry } from '@/editor/widgets/Entry'
import { Field } from '@/editor/widgets/Field'
import { Badge } from '@/editor/widgets/Badge'
import {
  relationGroup,
  type RelationGroup,
  type RelationTemplate,
} from '../../core/data/relations'
import { SegmentControl } from '../inspector/controls/SegmentControl'
import { isUnnamedTemplate, relationDisplay } from './relationLabel'
import { RELATION_GROUPS, VERB_SHORT } from './parameterText'

export function RelationPicker({
  label,
  entries,
  relationId,
  search,
  onSearch,
  onSelect,
}: {
  label: string
  entries: readonly RelationTemplate[]
  relationId: string
  search: string
  onSearch: (value: string) => void
  onSelect: (id: string) => void
}) {
  const [tab, setTab] = useState<RelationGroup>(() => {
    const chosen = entries.find((entry) => entry.id === relationId)
    if (chosen) return relationGroup(chosen)
    return entries.some((entry) => relationGroup(entry) === 'read') || entries.length === 0
      ? 'read'
      : 'write'
  })

  const read = entries.filter((entry) => relationGroup(entry) === 'read')
  const write = entries.filter((entry) => relationGroup(entry) === 'write')
  const numerator: Record<RelationGroup, number> = { read: read.length, write: write.length }
  const active: RelationGroup = tab
  const visible = active === 'read' ? read : write

  const searches = search.trim().length > 0
  const tabOptions = RELATION_GROUPS.map((group) => ({
    ...group,
    label: searches ? `${group.name} · ${numerator[group.value as RelationGroup]}` : group.name,
  }))
  return (
    <div className="flex flex-col gap-2">
      <span className="text-dense font-medium">{label}</span>
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
        <Field
          aria-label={`${label} suchen`}
          value={search}
          className="pl-7"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <SegmentControl
        name="Lesen oder Schreiben"
        value={active}
        options={tabOptions}
        onChange={(value) => setTab(value as RelationGroup)}
      />

      <div className="max-h-36 overflow-y-auto border-y border-line p-1">
        {visible.map((entry) => {
          const unnamed = isUnnamedTemplate(entry)
          return (
            <Entry
              key={entry.id}
              icon={Share2}
              name={relationDisplay(entry)}
              active={entry.id === relationId}
              onClick={() => onSelect(entry.id)}
              right={unnamed ? undefined : (
                <Badge>
                  {VERB_SHORT[entry.verb]} {entry.nr}
                </Badge>
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
