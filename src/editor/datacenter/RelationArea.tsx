import { useState } from 'react'
import { Search } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { relationIdsOf } from '../../core/block/treeQuery'
import { blockName } from '../../core/block/blockName'
import {
  relationFitsToSearch,
  relationSyntaxAsText,
  relationSyntaxRead,
  type RelationTemplate,
} from '../../core/data/relations'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { Line, NewLine, Strip, TH } from './GridLines'

// The relations as SoftEngine lists them: a line per relation, the syntax and
// its name, a search above, the marked one spelled out below. A new one is
// typed into the empty last line.
export function RelationArea() {
  const store = useRelations()
  const ed = useEditor()
  const sources = useDataSources().list
  const [search, setSearch] = useState('')
  const [selectionId, setSelectionId] = useState<string | null>(null)

  const hits = store.list.filter((r) => relationFitsToSearch(r, search))
  const selection = hits.find((r) => r.id === selectionId) ?? null

  const usageOf = (id: string): string[] =>
    Object.values(ed.tree)
      .filter((n) => relationIdsOf(n).includes(id))
      .map((n) => blockName(n, sources))

  const data = (r: RelationTemplate | undefined, syntaxText: string, name: string): Omit<RelationTemplate, 'id'> | null => {
    const syntax = relationSyntaxRead(syntaxText)
    if (!syntax || name.trim() === '') return null
    const positions = r?.positions
    const keeps = positions && syntax.verb === 'GET_RELATION' && positions.slots.length === syntax.parameter.length
    return {
      name: name.trim(),
      verb: syntax.verb,
      nr: syntax.nr,
      parameter: [...syntax.parameter],
      extraParameterAllowed: syntax.extraParameterAllowed,
      ...(keeps ? { positions } : {}),
    }
  }

  const reads = (v: readonly string[]): boolean =>
    relationSyntaxRead(v[0] ?? '') !== null && (v[1] ?? '').trim() !== ''

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
      <Strip right={hits.length}>
        <span className="flex items-center gap-[8px]">
          <Search size={13} aria-hidden />
          <input
            aria-label="Relationen durchsuchen"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className="h-[22px] w-[240px] rounded border border-line bg-panel px-[6px] font-normal text-ui text-ink outline-none focus:border-accent"
          />
        </span>
      </Strip>
      {/* A click below the lines lets go of the marked relation; the side
          stays and stands empty. */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        onClick={(e) => { if (e.target === e.currentTarget) setSelectionId(null) }}
      >
        <table className="w-full table-fixed border-collapse text-ui">
          <thead className="sticky top-0 z-[1]">
            <tr>
              <th className={cn(TH, 'w-[60%]')}>Syntax</th>
              <th className={TH}>Bezeichnung</th>
              <th className={cn(TH, 'w-control')} />
            </tr>
          </thead>
          <tbody>
            {hits.map((r) => (
              <Line
                key={`${r.id}:${relationSyntaxAsText(r)}:${r.name}`}
                cells={[relationSyntaxAsText(r), r.name]}
                names={['Syntax', 'Bezeichnung']}
                mono={[true, false]}
                valid={reads}
                active={selection?.id === r.id}
                onSelect={() => setSelectionId(r.id)}
                onSave={(v) => {
                  const next = data(r, v[0] ?? '', v[1] ?? '')
                  if (!next) return
                  if (relationSyntaxAsText(next) === relationSyntaxAsText(r) && next.name === r.name) return
                  store.update(r.id, next)
                }}
                onRemove={() => store.remove(r.id)}
              />
            ))}
            <NewLine
              names={['Neue Relation, Syntax', 'Neue Relation, Bezeichnung']}
              mono={[true, false]}
              valid={(v) => (v[0] ?? '').trim() === '' || relationSyntaxRead(v[0] ?? '') !== null}
              onAdd={(v) => {
                const next = data(undefined, v[0] ?? '', v[1] ?? '')
                if (!next) return false
                setSelectionId(store.add(next).id)
                return true
              }}
            />
          </tbody>
        </table>
      </div>

      </div>

      <div className="flex w-[400px] shrink-0 flex-col border-l border-line">
      {!selection && <Strip>Relation</Strip>}
      {selection && (
        <>
          <Strip>{selection.name}</Strip>
          <div className="break-all border-b border-line px-[12px] py-[8px] font-mono text-dense text-ink">
            {relationSyntaxAsText(selection)}
          </div>
          <Strip right={selection.parameter.length}>Stellen</Strip>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-ui">
              <tbody>
                {selection.parameter.map((name, i) => (
                  <tr key={i}>
                    <td className="h-[26px] w-[44px] border-b border-r border-line/70 px-[10px] text-right font-mono text-dense text-muted">{i + 1}</td>
                    <td className="h-[26px] border-b border-line/70 px-[10px] font-mono text-dense">{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usageOf(selection.id).length > 0 && (
            <>
              <div className="border-t border-line"><Strip>Benutzt von</Strip></div>
              <div className="px-[12px] py-[8px] text-dense">{usageOf(selection.id).join(', ')}</div>
            </>
          )}
        </>
      )}
      </div>
    </div>
  )
}
