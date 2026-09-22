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
import { parameterMeaning, RELATION_GROUPS, VERB_SHORT } from './parameterText'

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
  const [mode, setMode] = useState<'read' | 'edit' | 'next'>('read')

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
          <Button className="w-full" onClick={() => setMode('next')}>
            <Plus size={14} /> Neue Relation
          </Button>
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-matt"
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
            const active = mode !== 'next' && selection?.id === r.id
            return (
              <Entry
                key={r.id}
                icon={Share2}
                name={r.name}
                active={active}
                onClick={() => { setSelectionId(r.id); setMode('read') }}
                right={(
                  <Mark hint={relationSyntaxAsText(r)}>
                    {VERB_SHORT[r.verb]} {r.nr}
                  </Mark>
                )}
              />
            )
          })}
          {store.list.length === 0 && (
            <p className="px-1 py-2 text-dicht text-matt">
              Noch keine Relationen.
            </p>
          )}
          {store.list.length > 0 && visibleRelation.length === 0 && (
            <p className="px-1 py-2 text-dicht text-matt">Keine Treffer.</p>
          )}
          </>
        )}
        detail={(
          <>
        {mode === 'next' && <RelationForm onClose={() => setMode('read')} />}
        {mode === 'edit' && selection && (
          <RelationForm relation={selection} onClose={() => setMode('read')} />
        )}
        {mode === 'read' && !selection && (
          <p className="text-dicht text-matt">
            Keine Relation gewählt.
          </p>
        )}
        {mode === 'read' && selection && (
          <div className="flex flex-col gap-4 text-ui">
            <div>
              <h3 className="text-ui font-semibold text-tinte">{selection.name}</h3>
            </div>

            <Group title="Parameter — in genau dieser Reihenfolge">
              <div className="overflow-hidden rounded border border-linie">
                <table className="w-full">
                  <tbody>
                    {selection.parameter.map((p, i) => (
                      <tr key={i} className="border-b border-linie last:border-b-0">
                        <td className="w-6 px-2 py-1 text-right font-mono text-dicht text-matt">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1 font-mono text-dicht">
                          {p === '' ? <span className="text-matt">(leer)</span> : p}
                        </td>
                        <td className="px-2 py-1 text-matt">{parameterMeaning(p)}</td>
                      </tr>
                    ))}
                    {selection.parameter.length === 0 && (
                      <tr><td className="px-2.5 py-1 text-matt">Keine Parameter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Group>

            <Group title="Gespeicherte SoftEngine-Syntax">
              <code className="block overflow-x-auto rounded bg-control px-2.5 py-1.5 font-mono text-dicht">
                {relationSyntaxAsText(selection)}
              </code>
            </Group>

            <Group title="Verwendung in dieser Maske">
              {usageOf(selection.id).length === 0 ? (
                <p className="text-matt">Von keinem Baustein verwendet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {usageOf(selection.id).map((name, i) => (
                    <li key={i} className="rounded border border-linie bg-control px-2.5 py-1">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <div className="flex gap-2 border-t border-linie pt-3">
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
