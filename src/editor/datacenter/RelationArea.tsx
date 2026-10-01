import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Search, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
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

// The relations as SoftEngine lists them: a line per relation, the syntax
// and its name, a search above, the marked one spelled out below. A new one
// is typed into the empty last line.
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

  const save = (r: RelationTemplate, syntaxText: string, name: string): void => {
    const syntax = relationSyntaxRead(syntaxText)
    if (!syntax || name.trim() === '') return
    const positions = r.positions
    const keeps = positions && syntax.verb === 'GET_RELATION' && positions.slots.length === syntax.parameter.length
    store.update(r.id, {
      name: name.trim(),
      verb: syntax.verb,
      nr: syntax.nr,
      parameter: [...syntax.parameter],
      extraParameterAllowed: syntax.extraParameterAllowed,
      ...(keeps ? { positions } : {}),
    })
  }

  const add = (syntaxText: string, name: string): boolean => {
    const syntax = relationSyntaxRead(syntaxText)
    if (!syntax || name.trim() === '') return false
    const entry = store.add({
      name: name.trim(),
      verb: syntax.verb,
      nr: syntax.nr,
      parameter: [...syntax.parameter],
      extraParameterAllowed: syntax.extraParameterAllowed,
    })
    setSelectionId(entry.id)
    return true
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-[8px] border-b border-line px-[12px] py-[6px]">
        <Search size={13} aria-hidden className="shrink-0 text-muted" />
        <input
          aria-label="Relationen durchsuchen"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="h-control min-w-0 flex-1 bg-transparent text-ui text-ink outline-none"
        />
        <span className="shrink-0 tabular-nums text-dense text-muted">{hits.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-ui">
          <thead className="sticky top-0 bg-panel">
            <tr className="border-b border-line text-left text-dense text-muted">
              <th className="w-[58%] px-[12px] py-[4px] font-semibold">Syntax</th>
              <th className="px-[8px] py-[4px] font-semibold">Bezeichnung</th>
              <th className="w-control" />
            </tr>
          </thead>
          <tbody>
            {hits.map((r) => (
              <RelationLine
                key={`${r.id}:${relationSyntaxAsText(r)}:${r.name}`}
                relation={r}
                active={selection?.id === r.id}
                onSelect={() => setSelectionId(r.id)}
                onSave={(syntaxText, name) => save(r, syntaxText, name)}
                onRemove={() => store.remove(r.id)}
              />
            ))}
            <NewLine onAdd={add} />
          </tbody>
        </table>
      </div>

      {selection && (
        <div className="shrink-0 border-t border-line px-[12px] py-[8px]">
          <div className="font-mono text-ui-title text-ink">{relationSyntaxAsText(selection)}</div>
          <div className="font-semibold text-ink">{selection.name}</div>
          {usageOf(selection.id).length > 0 && (
            <div className="text-dense text-muted">{usageOf(selection.id).join(', ')}</div>
          )}
        </div>
      )}
    </div>
  )
}

const CELL = 'h-control w-full min-w-0 bg-transparent px-[8px] text-ui text-ink outline-none focus:bg-panel focus:shadow-focus'

// Focus that leaves the line, not just the cell.
const leavesLine = (e: FocusEvent<HTMLElement>): boolean =>
  !(e.currentTarget.closest('tr')?.contains(e.relatedTarget as Node | null) ?? false)

function RelationLine({ relation, active, onSelect, onSave, onRemove }: {
  relation: RelationTemplate
  active: boolean
  onSelect: () => void
  onSave: (syntaxText: string, name: string) => void
  onRemove: () => void
}) {
  // The line is keyed by what the store holds: a saved change remounts it.
  const stored = relationSyntaxAsText(relation)
  const [syntaxText, setSyntaxText] = useState(stored)
  const [name, setName] = useState(relation.name)

  const valid = relationSyntaxRead(syntaxText) !== null
  const commit = () => onSave(syntaxText, name)
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { commit(); e.currentTarget.blur() }
    if (e.key === 'Escape') { setSyntaxText(stored); setName(relation.name); e.currentTarget.blur() }
  }

  return (
    <tr
      className={cn('border-b border-line', active ? 'bg-accent-soft' : 'hover:bg-ground')}
      onClick={onSelect}
    >
      <td className="pl-[4px]">
        <input
          aria-label="Syntax"
          value={syntaxText}
          spellCheck={false}
          className={cn(CELL, 'font-mono', !valid && 'text-error')}
          onFocus={onSelect}
          onChange={(e) => setSyntaxText(e.currentTarget.value)}
          onKeyDown={onKey}
          onBlur={(e) => { if (leavesLine(e)) commit() }}
        />
      </td>
      <td>
        <input
          aria-label="Bezeichnung"
          value={name}
          className={CELL}
          onFocus={onSelect}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={onKey}
          onBlur={(e) => { if (leavesLine(e)) commit() }}
        />
      </td>
      <td>
        <Button onlyIcon aria-label="Relation löschen" title="Löschen" onClick={(e) => { e.stopPropagation(); onRemove() }}>
          <Trash2 size={13} />
        </Button>
      </td>
    </tr>
  )
}

// The empty last line: syntax, Tab, name, Enter.
function NewLine({ onAdd }: { onAdd: (syntaxText: string, name: string) => boolean }) {
  const [syntaxText, setSyntaxText] = useState('')
  const [name, setName] = useState('')
  const valid = syntaxText === '' || relationSyntaxRead(syntaxText) !== null
  const commit = () => {
    if (onAdd(syntaxText, name)) { setSyntaxText(''); setName('') }
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
  }
  return (
    <tr>
      <td className="pl-[4px]">
        <input
          aria-label="Neue Relation, Syntax"
          value={syntaxText}
          spellCheck={false}
          className={cn(CELL, 'font-mono', !valid && 'text-error')}
          onChange={(e) => setSyntaxText(e.currentTarget.value)}
          onKeyDown={onKey}
          onBlur={(e) => { if (leavesLine(e)) commit() }}
        />
      </td>
      <td>
        <input
          aria-label="Neue Relation, Bezeichnung"
          value={name}
          className={CELL}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={onKey}
          onBlur={(e) => { if (leavesLine(e)) commit() }}
        />
      </td>
      <td />
    </tr>
  )
}
