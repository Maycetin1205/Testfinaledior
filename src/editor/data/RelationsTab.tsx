import { useState } from 'react'
import { Search } from '@/editor/icons/icon'
import { Grid, GridLine, GridNewLine, Strip, TD } from '@/editor/widgets/Grid'
import { blockName } from '../../core/block/blockName'
import { relationIdsOf } from '../../core/block/treeQuery'
import {
  relationFitsToSearch,
  relationSyntaxAsText,
  relationSyntaxRead,
  type RelationTemplate,
} from '../../core/data/relations'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'

const COLUMNS = [
  { name: 'Syntax', mono: true },
  { name: 'Bezeichnung', width: 260 },
]

const at = (v: readonly string[], k: number): string => v[k] ?? ''

// A relation from its typed syntax and name. Positions a GET relation knows
// stay while its places keep their count.
function relationFrom(before: RelationTemplate | undefined, syntaxText: string, name: string): Omit<RelationTemplate, 'id'> | null {
  const syntax = relationSyntaxRead(syntaxText)
  if (!syntax || name.trim() === '') return null
  const positions = before?.positions
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

// The relations as SoftEngine lists them: a line per relation with its syntax
// and its name, a search above. On the right the marked one spelled out: its
// places numbered, and where the mask uses it.
export function RelationsTab() {
  const store = useRelations()
  const ed = useEditor()
  const sources = useDataSources().list
  const [search, setSearch] = useState('')
  const [markedId, setMarkedId] = useState<string | null>(null)

  const hits = store.list.filter((r) => relationFitsToSearch(r, search))
  const marked = hits.find((r) => r.id === markedId)
  const usage = marked
    ? Object.values(ed.tree).filter((n) => relationIdsOf(n).includes(marked.id)).map((n) => blockName(n, sources))
    : []

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <Strip right={hits.length}>
          <Search size={13} aria-hidden />
          <input
            aria-label="Relationen durchsuchen"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className="h-[22px] w-[240px] rounded border border-line bg-panel px-[6px] font-normal text-ui text-ink outline-none focus:border-accent"
          />
        </Strip>
        <Grid columns={COLUMNS} onEmpty={() => setMarkedId(null)}>
          {hits.map((r) => (
            <GridLine
              key={r.id}
              cells={[relationSyntaxAsText(r), r.name]}
              marked={marked?.id === r.id}
              tips
              valid={(v) => relationFrom(r, at(v, 0), at(v, 1)) !== null}
              onMark={() => setMarkedId(r.id)}
              onSave={(v) => {
                const next = relationFrom(r, at(v, 0), at(v, 1))
                if (next) store.update(r.id, next)
              }}
              onRemove={() => store.remove(r.id)}
            />
          ))}
          <GridNewLine
            names={['Neue Relation, Syntax', 'Neue Relation, Bezeichnung']}
            valid={(v) => at(v, 0).trim() === '' || relationSyntaxRead(at(v, 0)) !== null}
            onAdd={(v) => {
              const next = relationFrom(undefined, at(v, 0), at(v, 1))
              if (!next) return false
              setMarkedId(store.add(next).id)
              return true
            }}
          />
        </Grid>
      </div>

      <div className="flex w-[300px] shrink-0 flex-col border-l border-line">
        <Strip>{marked?.name ?? 'Relation'}</Strip>
        {marked && (
          <>
            <div className="break-all border-b border-line px-[12px] py-[8px] font-mono text-dense">
              {relationSyntaxAsText(marked)}
            </div>
            <Strip right={marked.parameter.length}>Stellen</Strip>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {marked.parameter.map((name, i) => (
                    <tr key={i}>
                      <td className={`${TD} w-[44px] px-[10px] text-right font-mono text-dense text-muted`}>{i + 1}</td>
                      <td className={`${TD} px-[10px] font-mono text-dense`}>{name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usage.length > 0 && (
              <>
                <div className="border-t border-line"><Strip>Benutzt von</Strip></div>
                <div className="px-[12px] py-[8px] text-dense">{usage.join(', ')}</div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
