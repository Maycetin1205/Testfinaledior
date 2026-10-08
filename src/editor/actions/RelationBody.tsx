import { useState } from 'react'
import { cn } from '@/editor/widgets/cn'
import { Grid, Strip, TD } from '@/editor/widgets/Grid'
import { relationParameterDefault } from '../../core/data/actions'
import {
  relationFitsToSearch,
  relationGroup,
  relationSyntaxAsText,
  type RelationTemplate,
} from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { PickerControl } from '../controls/PickerControl'
import type { Reach } from '../origin/reach'
import { Places, Result } from './Places'

// A relation step: the relation, its places as SoftEngine resolves them and
// the relation as it goes out; without a relation, the list to choose one.
export function RelationBody({ step, group, template, relations, reach, onChange }: {
  step: RelationStep
  group: 'read' | 'write'
  template: RelationTemplate | undefined
  relations: readonly RelationTemplate[]
  reach: Reach
  onChange: (step: RelationStep) => void
}) {
  const offered = relations.filter((r) => relationGroup(r) === group)
  const choose = (relationId: string) => {
    const t = relations.find((r) => r.id === relationId)
    if (!t) return
    onChange({
      ...step,
      relationId,
      parameter: relationParameterDefault(t),
      extraParameter: t.extraParameterAllowed ? step.extraParameter : [],
    })
  }

  // Without a relation the window lists them all, as SoftEngine's choice of
  // variables does: syntax and name, a search above, a click takes one.
  if (!template) return <RelationList relations={offered} onChoose={choose} />

  const all = [...step.parameter, ...step.extraParameter]
  const used = all.filter((b) => !(b.source === 'omitted' || (b.source === 'fixed' && b.value.trim() === ''))).length

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <Strip>Relation</Strip>
        <div className="border-b border-line px-[12px] py-[8px]">
          <PickerControl
            name="Relation"
            className="w-full"
            groups={[{ key: 'relations', entries: offered.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })) }]}
            value={template.id}
            onChoose={choose}
          />
        </div>
        <Strip right={`${used} von ${all.length} belegt`}>Stellen</Strip>
        <Places
          key={template.id}
          template={template}
          filled={step}
          reach={reach}
          onChange={(filled) => onChange({ ...step, parameter: [...filled.parameter], extraParameter: [...filled.extraParameter] })}
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <Strip>Ergebnis</Strip>
        <Result template={template} filled={step} reach={reach} />
        <Strip>Bezeichnung</Strip>
        <div className="px-[12px] py-[9px]">{template.name}</div>
      </div>
    </div>
  )
}

function RelationList({ relations, onChoose }: {
  relations: readonly RelationTemplate[]
  onChoose: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const hits = relations.filter((r) => relationFitsToSearch(r, search))
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip right={hits.length}>
        <input
          aria-label="Relationen durchsuchen"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="h-[22px] w-[260px] rounded border border-line bg-panel px-[6px] font-normal text-ui text-ink outline-none focus:border-accent"
        />
      </Strip>
      <Grid columns={[{ name: 'Syntax', mono: true }, { name: 'Bezeichnung', width: 300 }]}>
        {hits.map((r) => (
          <tr key={r.id} className="cursor-pointer hover:bg-accent-soft" onClick={() => onChoose(r.id)}>
            <td className={cn(TD, 'truncate px-[10px] font-mono text-dense')} title={relationSyntaxAsText(r)}>{relationSyntaxAsText(r)}</td>
            <td className={cn(TD, 'truncate px-[10px]')}>{r.name}</td>
          </tr>
        ))}
      </Grid>
    </div>
  )
}
