import { ArrowDown, ArrowUp, Copy, X } from '@/editor/icons/icon'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { Badge } from '@/editor/widgets/Badge'
import { valueSpotsInTree, selectionGiverInTree } from '../../core/block/treeQuery'
import { anchorStepId, resultStepsBefore, stepProblem } from '../../core/data/steps/chains'
import { stepAdapter, type Step } from '../../core/data/steps/steps'
import { deepClone } from '../../core/deepClone'
import { isWindowPage } from '../../core/block/pages'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { VERB_SHORT } from './parameterText'

interface StepListProps {
  steps: readonly Step[]

  activeId?: string

  onChoose?: (step: Step) => void

  onChange?: (steps: Step[]) => void
}

export function StepList({
  steps, activeId, onChoose, onChange,
}: StepListProps) {
  const ed = useEditor()
  const relation = useRelations()
  const dataSources = useDataSources()

  const popupPages = ed.pages.filter(isWindowPage)
  const actionValueRefs = valueSpotsInTree(ed.tree).map(({ node, spot }) => ({
    blockId: node.id,
    prop: spot.prop,
  }))

  const giverIds = selectionGiverInTree(ed.tree).map((n) => n.id)

  const move = (from: number, to: number): void => {
    if (!onChange) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const setNote = (at: number, text: string): void => {
    if (!onChange) return
    const next = steps.map((s, i) => {
      if (i !== at) return s
      const copy = { ...s }
      if (text.trim() === '') delete copy.note
      else copy.note = text
      return copy
    })
    onChange(next)
  }

  const duplicate = (at: number): void => {
    if (!onChange) return
    const copy: Step = { ...deepClone(steps[at]), id: crypto.randomUUID() }
    const next = [...steps]
    next.splice(at + 1, 0, copy)
    onChange(next)
  }

  return (
    <ol>
      {steps.map((s, i) => {
        const problem = stepProblem(s, {
          relations: relation.list,
          dataSources: dataSources.list,
          popupIds: popupPages.map((page) => page.id),
          resultIds: resultStepsBefore(steps, s.id, relation.list).map((g) => g.id),
          actionValues: actionValueRefs,
          selectionGiverIds: giverIds,
          before: steps.slice(0, i),
        })
        const summary = stepAdapter(s.kind).summary(s, {
          relations: relation.list,
          tree: ed.tree,
          sources: dataSources.list,
          popupName: (id) => popupPages.find((page) => page.id === id)?.name,
          stepNumber: (id) => steps.findIndex((x) => x.id === id) + 1,
        })
        const stepRelation = summary.relation

        const closer = [summary.target !== '' ? summary.target : summary.table, summary.origin]
          .filter((t) => t !== '')
          .join('  ←  ')
        const noteOpen = onChange !== undefined && s.id === activeId
        const anchor = anchorStepId(s)
        const indented = anchor !== '' && steps.some((x) => x.id === anchor)

        return (
          <li key={s.id} className="border-b border-line last:border-b-0">
            <div
              className={`flex items-center gap-2 border-l-2 py-1.5 pr-1 transition-colors ${
                indented ? 'pl-5' : 'pl-1'
              } ${
                problem !== null
                  ? 'border-pending bg-pending-soft'
                  : s.id === activeId
                    ? 'border-accent bg-accent-soft'
                    : 'border-transparent hover:bg-accent-soft'
              }`}
            >

              <span className="w-6 shrink-0 text-right text-dense tabular-nums text-muted">
                {i + 1}.
              </span>

              <Button
                disabled={!onChoose}
                onClick={() => onChoose?.(s)}
                className="h-auto min-w-0 flex-[3] flex-col items-start justify-start py-1 text-left"
              >
                <span className="block w-full truncate text-dense">
                  {summary.what}
                  {summary.detail}
                </span>
                {closer !== '' && (
                  <span className="block w-full truncate text-dense text-muted">
                    {closer}
                  </span>
                )}
              </Button>

              {stepRelation && (
                <Badge>
                  {VERB_SHORT[stepRelation.verb]} {stepRelation.nr}
                </Badge>
              )}

              {noteOpen ? (
                <Field
                  aria-label={`Notiz zu Schritt ${i + 1}`}
                  placeholder="Notiz"
                  value={s.note ?? ''}
                  onChange={(e) => setNote(i, e.target.value)}
                  className="min-w-0 flex-[2] border-transparent bg-transparent text-dense hover:border-line"
                />
              ) : (
                s.note !== undefined && s.note !== '' && (
                  <span
                    className="min-w-0 flex-[2] truncate text-dense italic text-muted"
                  >
                    {s.note}
                  </span>
                )
              )}
              {onChange && (
                <span className="flex shrink-0 items-center">
                  <Button
                    onlyIcon
                    aria-label={`Schritt ${i + 1} nach oben`}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    <ArrowUp size={12} />
                  </Button>
                  <Button
                    onlyIcon
                    aria-label={`Schritt ${i + 1} nach unten`}
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDown size={12} />
                  </Button>
                  <Button
                    onlyIcon
                    aria-label={`Schritt ${i + 1} duplizieren`}
                    onClick={() => duplicate(i)}
                  >
                    <Copy size={12} />
                  </Button>
                  <Button
                    onlyIcon
                    aria-label={`Schritt ${i + 1} löschen`}
                    onClick={() => onChange(steps.filter((x) => x.id !== s.id))}
                  >
                    <X size={12} />
                  </Button>
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
