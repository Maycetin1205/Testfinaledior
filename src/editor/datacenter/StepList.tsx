import { ArrowDown, ArrowUp, Copy, X } from '@/editor/icons/icon'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/PushButton'
import { Mark } from '@/editor/widgets/Badge'
import { valueSpotsInTree, selectionGiverInTree } from '../../core/block/treeQuery'
import { resultStepsBefore, type Step } from '../../core/data/actions'
import { stepProblem } from '../../core/data/stepCheck'
import { stepName } from './wording'
import { isWindowPage } from '../../core/block/pages'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelation } from '../state/useRelations'
import { VERB_SHORT } from './parameterText'
import { isUnnamedTemplate } from './relationLabel'
import { anchorStepId, stepSummary } from './stepSummary'

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
  const relation = useRelation()
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
    const source = steps[at]
    const copy: Step = source.kind === 'START_TOOL'
      ? { ...source, toolParameter: [...source.toolParameter], id: crypto.randomUUID() }
      : source.kind === 'RELATION'
        ? {
            ...source,
            parameter: source.parameter.map((binding) => ({ ...binding })),
            extraParameter: source.extraParameter.map((binding) => ({ ...binding })),
            id: crypto.randomUUID(),
          }
        : { ...source, id: crypto.randomUUID() }
    const next = [...steps]
    next.splice(at + 1, 0, copy)
    onChange(next)
  }

  return (
    <ol>
      {steps.map((s, i) => {
        const problem = stepProblem(
          s, relation.list, dataSources.list, popupPages.map((page) => page.id),
          resultStepsBefore(steps, s.id, relation.list).map((g) => g.id),
          actionValueRefs,
          giverIds,
          steps.slice(0, i),
        )
        const stepRelation = s.kind === 'RELATION' ? relation.get(s.relationId) : undefined
        const popupName = s.kind === 'POPUP_OPEN' || s.kind === 'POPUP_CLOSE'
          ? popupPages.find((page) => page.id === s.popupId)?.name
          : undefined

        const what = s.kind === 'RELATION' && stepRelation && !isUnnamedTemplate(stepRelation)
          ? stepRelation.name
          : stepName(s.kind)
        const zus = stepSummary(
          s, what, stepRelation, ed.tree, dataSources.list,
          (id) => steps.findIndex((x) => x.id === id) + 1,
        )

        const closer = [zus.target !== '' ? zus.target : zus.table, zus.origin]
          .filter((t) => t !== '')
          .join('  ←  ')
        const noteOpen = onChange !== undefined && s.id === activeId
        const anchor = anchorStepId(s)
        const indented = anchor !== '' && steps.some((x) => x.id === anchor)

        return (
          <li key={s.id} className="border-b border-linie last:border-b-0">
            <div
              className={`flex items-center gap-2 border-l-2 py-1.5 pr-1 transition-colors ${
                indented ? 'pl-5' : 'pl-1'
              } ${
                problem !== null
                  ? 'border-vormerkung bg-vormerkung/15'
                  : s.id === activeId
                    ? 'border-akzent bg-akzent/15'
                    : 'border-transparent hover:bg-control'
              }`}
            >

              <span className="w-6 shrink-0 text-right text-dicht tabular-nums text-matt">
                {i + 1}.
              </span>

              <Button
                disabled={!onChoose}
                onClick={() => onChoose?.(s)}
                className="h-auto min-w-0 flex-[3] flex-col items-start justify-start py-1 text-left"
              >
                <span className="block w-full truncate text-dicht">
                  {zus.what}
                  {s.kind === 'START_TOOL' && s.toolNr.trim() !== '' ? ` — Nr. ${s.toolNr}` : ''}
                  {s.kind === 'BW_LINK' && s.command.trim() !== '' ? ` — ${s.command}` : ''}
                  {popupName ? ` — ${popupName}` : ''}
                </span>
                {closer !== '' && (
                  <span className="block w-full truncate text-dicht text-matt">
                    {closer}
                  </span>
                )}
              </Button>

              {stepRelation && (
                <Mark>
                  {VERB_SHORT[stepRelation.verb]} {stepRelation.nr}
                </Mark>
              )}

              {noteOpen ? (
                <Field
                  aria-label={`Notiz zu Schritt ${i + 1}`}
                  placeholder="Notiz"
                  value={s.note ?? ''}
                  onChange={(e) => setNote(i, e.target.value)}
                  className="min-w-0 flex-[2] border-transparent bg-transparent text-dicht hover:border-linie"
                />
              ) : (
                s.note !== undefined && s.note !== '' && (
                  <span
                    className="min-w-0 flex-[2] truncate text-dicht italic text-matt"
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
