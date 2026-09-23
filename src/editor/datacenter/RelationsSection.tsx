import { useState, type ReactNode } from 'react'
import { Plus, Search, Share2 } from '@/editor/icons/icon'
import { Field } from '@/editor/widgets/Field'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/PushButton'
import { ListDetail } from '@/editor/widgets/ListDetail'
import { Entry } from '@/editor/widgets/Entry'
import { Mark } from '@/editor/widgets/Badge'
import { relationIdsOf } from '../../core/block/treeQuery'
import {
  relationSyntaxAsText,
  relationGroup,
  relationFitsToSearch,
  type RelationGroup,
  type RelationTemplate,
} from '../../core/data/relations'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelation } from '../state/useRelations'
import { SegmentControl } from '../inspector/controls/SegmentControl'
import { RelationForm } from './RelationForm'
import { blockName } from '../../core/block/blockName'
import { RELATION_GROUPS, VERB_SHORT } from './parameterText'

export function RelationArea({ areas }: { areas?: ReactNode }) {
  const store = useRelation()
  const ed = useEditor()
  const sources = useDataSources().list
  const [search, setSearch] = useState('')

  const [filter, setFilter] = useState<RelationGroup>(() =>
    store.list.some((r) => relationGroup(r) === 'read') || store.list.length === 0
      ? 'read'
      : 'write')
  const [selectionId, setSelectionId] = useState<string | null>(store.list[0]?.id ?? null)
  const [mode, setMode] = useState<'read' | 'edit' | 'new'>('read')

  const hitAll = store.list.filter((relation) => relationFitsToSearch(relation, search))
  const numerator: Record<RelationGroup, number> = {
    read: hitAll.filter((r) => relationGroup(r) === 'read').length,
    write: hitAll.filter((r) => relationGroup(r) === 'write').length,
  }
  const activeFilter: RelationGroup = filter
  const visibleRelation = hitAll.filter((r) => relationGroup(r) === activeFilter)

  const searches = search.trim().length > 0
  const filterOptions = RELATION_GROUPS.map((group) => ({
    ...group,
    label: searches ? `${group.name} · ${numerator[group.value as RelationGroup]}` : group.name,
  }))
  const selection = visibleRelation.find((r) => r.id === selectionId) ?? visibleRelation[0]

  const usageOf = (id: string): string[] =>
    Object.values(ed.tree)
      .filter((n) => relationIdsOf(n).includes(id))
      .map((n) => blockName(n, sources))

  function deleteEntry(r: RelationTemplate) {
    store.remove(r.id)
    setMode('read')
  }

  return (
    <>
      <ListDetail
        areas={areas}
        listHead={(
          <>
          <Button className="w-full" onClick={() => setMode('new')}>
            <Plus size={14} /> Neue Relation
          </Button>
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted"
            />
            <Field
              aria-label="Relationen durchsuchen"
              value={search}
              placeholder="Suchen"
              className="pl-7"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SegmentControl
            name="Lesen oder Schreiben"
            value={activeFilter}
            options={filterOptions}
            onChange={(value) => setFilter(value as RelationGroup)}
          />
          </>
        )}
        list={(
          <>
          {visibleRelation.map((r) => {
            const active = mode !== 'new' && selection?.id === r.id
            return (
              <Entry
                key={r.id}
                icon={Share2}
                name={r.name}
                active={active}
                onClick={() => { setSelectionId(r.id); setMode('read') }}
                right={(
                  <Mark>
                    {VERB_SHORT[r.verb]} {r.nr}
                  </Mark>
                )}
              />
            )
          })}
          </>
        )}
        detail={(
          <>
        {mode === 'new' && <RelationForm onClose={() => setMode('read')} />}
        {mode === 'edit' && selection && (
          <RelationForm relation={selection} onClose={() => setMode('read')} />
        )}
        {mode === 'read' && selection && (
          <div className="flex flex-col gap-4 text-ui">
            <div>
              <h3 className="text-ui font-semibold text-ink">{selection.name}</h3>
            </div>

            <Group title="Parameter">
              <div className="overflow-hidden rounded border border-line">
                <table className="w-full">
                  <tbody>
                    {selection.parameter.map((p, i) => (
                      <tr key={i} className="border-b border-line last:border-b-0">
                        <td className="w-6 px-2 py-1 text-right font-mono text-dense text-muted">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1 font-mono text-dense">{p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Group>

            <Group title="Gespeicherte SoftEngine-Syntax">
              <code className="block overflow-x-auto rounded bg-control px-2.5 py-1.5 font-mono text-dense">
                {relationSyntaxAsText(selection)}
              </code>
            </Group>

            <Group title="Verwendung in dieser Maske">
              {usageOf(selection.id).length > 0 && (
                <ul className="flex flex-col gap-1">
                  {usageOf(selection.id).map((name, i) => (
                    <li key={i} className="rounded border border-line bg-control px-2.5 py-1">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <div className="flex gap-2 border-t border-line pt-3">
              <Button kind="primary" onClick={() => setMode('edit')}>Bearbeiten</Button>
              <Button kind="risk" onClick={() => deleteEntry(selection)}>Löschen</Button>
            </div>
          </div>
        )}
          </>
        )}
      />
    </>
  )
}
