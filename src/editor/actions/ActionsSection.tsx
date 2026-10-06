import { useMemo, type ReactNode } from 'react'
import { ArrowUp, Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Field } from '@/editor/widgets/Field'
import type { EventDef } from '../../core/block/capability'
import { isWindowPage, pagesOfMask } from '../../core/block/pages'
import type { BlockNode } from '../../core/block/tree'
import type { RelationTemplate } from '../../core/data/relations'
import type { Step } from '../../core/data/steps/steps'
import { useInputSession } from '../controls/useInputSession'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { useView } from '../state/useView'
import type { EditorStore } from '../state/EditorStore'
import { maskChoices } from './placeChoices'
import { StepWindow, type StepContext, type StepTab } from './StepWindow'

// The tab a step opens on.
function tabOf(step: Step, relations: readonly RelationTemplate[]): StepTab {
  if (step.kind === 'START_TOOL') return 'TOOL'
  if (step.kind === 'POPUP_OPEN' || step.kind === 'POPUP_CLOSE' || step.kind === 'MASK_CLOSE') return 'POPUP'
  return relations.find((r) => step.kind === 'RELATION' && r.id === step.relationId)?.verb === 'GET_RELATION' ? 'GET' : 'PUT'
}

const VERB_SHORT: Record<RelationTemplate['verb'], string> = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
  PUTADD_RELATION: 'PUTADD',
}

// What the steps of the mask can name: relations, popups and the places of the mask.
function useStepContext(): StepContext {
  const ed = useEditor()
  const relations = useRelations().list
  const sources = useDataSources().list
  const tree = ed.tree
  return useMemo(() => ({
    relations,
    popups: pagesOfMask(tree).filter(isWindowPage).map((p) => ({ value: p.id, name: p.name })),
    choices: maskChoices(tree, sources),
  }), [tree, sources, relations])
}

function chainOf(ed: EditorStore, blockId: string, key: string): Step[] {
  return ed.tree[blockId]?.chains?.[key] ?? []
}

function setChain(ed: EditorStore, blockId: string, key: string, steps: Step[]): void {
  const node = ed.tree[blockId]
  if (!node) return
  ed.updateBlockEvents(blockId, { ...(node.chains ?? {}), [key]: steps })
}

// The actions of a block: per event its steps as lines. A click on a line or
// on "Schritt hinzufügen" opens the step window in the middle of the screen.
export function ActionsSection({ block, events }: { block: BlockNode; events: readonly EventDef[] }) {
  const ed = useEditor()
  const opened = useView().stepWindow
  const relations = useRelations().list
  const context = useStepContext()

  return (
    <div className="flex flex-col gap-[10px]">
      {events.map((ev) => {
        const chain = chainOf(ed, block.id, ev.key)
        const set = (steps: Step[]) => setChain(ed, block.id, ev.key, steps)
        return (
          <section key={ev.key} className="flex flex-col gap-[4px]">
            <span className="text-dense font-semibold text-muted">{ev.name}</span>
            <div className="overflow-hidden rounded border border-line">
              {chain.map((step, i) => (
                <StepLine
                  key={step.id}
                  nr={i + 1}
                  step={step}
                  context={context}
                  open={opened?.blockId === block.id && opened.stepId === step.id}
                  onOpen={() => ed.openStep({ blockId: block.id, eventKey: ev.key, stepId: step.id, tab: tabOf(step, relations) })}
                  onChange={(next) => set(chain.map((s) => (s.id === step.id ? next : s)))}
                  onUp={i === 0 ? undefined : () => {
                    const next = [...chain]
                    next.splice(i - 1, 0, ...next.splice(i, 1))
                    set(next)
                  }}
                  onRemove={() => set(chain.filter((s) => s.id !== step.id))}
                />
              ))}
              <button
                type="button"
                onClick={() => ed.openStep({ blockId: block.id, eventKey: ev.key, stepId: null, tab: 'PUT' })}
                className="flex h-[30px] w-full items-center gap-[8px] px-[8px] text-left text-muted hover:bg-accent-soft hover:text-ink"
              >
                <Plus size={13} className="text-accent" /> Schritt hinzufügen
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}

// The open step window, drawn beside the mask so that closing the bar keeps it.
export function OpenStepWindow() {
  const ed = useEditor()
  const opened = useView().stepWindow
  const context = useStepContext()
  if (opened === null || ed.tree[opened.blockId] === undefined) return null

  const chain = chainOf(ed, opened.blockId, opened.eventKey)
  return (
    <StepWindow
      key={`${opened.blockId}:${opened.eventKey}:${opened.stepId ?? 'new'}`}
      nr={opened.stepId === null ? chain.length + 1 : chain.findIndex((s) => s.id === opened.stepId) + 1}
      step={chain.find((s) => s.id === opened.stepId)}
      tab={opened.tab}
      chain={chain}
      context={context}
      onApply={(next) => {
        setChain(ed, opened.blockId, opened.eventKey, chain.some((s) => s.id === next.id)
          ? chain.map((s) => (s.id === next.id ? next : s))
          : [...chain, next])
        ed.openStep(null)
      }}
      onClose={() => ed.openStep(null)}
    />
  )
}

const LINE = 'group flex h-[30px] items-center gap-[8px] border-b border-line/70 px-[8px]'

// What a step does, in a few words, and its short form on the right.
function stepWords(step: Step, context: StepContext): { words: string; short: string; known: boolean } {
  switch (step.kind) {
    case 'RELATION': {
      const t = context.relations.find((r) => r.id === step.relationId)
      return { words: t?.name ?? 'Relation', short: t ? `${VERB_SHORT[t.verb]} ${t.nr}` : '', known: t !== undefined }
    }
    case 'START_TOOL':
      return { words: 'START_TOOL', short: step.toolNumber, known: step.toolNumber !== '' }
    case 'POPUP_OPEN':
    case 'POPUP_CLOSE': {
      const name = context.popups.find((p) => p.value === step.popupId)?.name
      const verb = step.kind === 'POPUP_OPEN' ? 'öffnen' : 'schließen'
      return { words: name ? `Popup ${name} ${verb}` : `Popup ${verb}`, short: '', known: name !== undefined }
    }
    case 'MASK_CLOSE':
      return { words: 'Maske schließen', short: '', known: true }
    case 'BW_LINK':
      return { words: 'BW-Befehl', short: '', known: true }
  }
}

// One step as a line: its number, what it does, on the right its short form,
// and while the pointer is on it, up and remove. The open one is marked whole.
function StepLine({ nr, step, context, open, onOpen, onChange, onUp, onRemove }: {
  nr: number
  step: Step
  context: StepContext
  open: boolean
  onOpen: () => void
  onChange: (step: Step) => void
  onUp?: () => void
  onRemove: () => void
}) {
  const ends = (
    <span className="ml-auto flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      {onUp && (
        <Button onlyIcon aria-label="Schritt nach oben" title="Nach oben" onClick={(e) => { e.stopPropagation(); onUp() }}>
          <ArrowUp size={12} />
        </Button>
      )}
      <Button onlyIcon aria-label="Schritt entfernen" title="Entfernen" onClick={(e) => { e.stopPropagation(); onRemove() }}>
        <X size={13} />
      </Button>
    </span>
  )
  const number = <span className="w-[16px] shrink-0 text-right font-mono text-dense opacity-70">{nr}</span>

  // A BW command of an older mask stays as it was: typed in its line.
  if (step.kind === 'BW_LINK') {
    return (
      <div className={LINE}>
        {number}
        <span className="shrink-0">BW-Befehl</span>
        <InlineText name="Befehl" value={step.command} onChange={(command) => onChange({ ...step, command })} />
        {ends}
      </div>
    )
  }

  const { words, short, known } = stepWords(step, context)
  return (
    <Clickable open={open} onClick={onOpen}>
      {number}
      <span className={cn('min-w-0 truncate', !known && 'opacity-60')}>{words}</span>
      {short !== '' && (
        <span className="shrink-0 border-l border-line pl-[8px] font-mono text-dense opacity-70">{short}</span>
      )}
      {ends}
    </Clickable>
  )
}

function Clickable({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className={cn(LINE, 'cursor-pointer', open ? 'bg-accent text-panel' : 'hover:bg-accent-soft')}
    >
      {children}
    </div>
  )
}

function InlineText({ name, value, onChange }: {
  name: string
  value: string
  onChange: (value: string) => void
}) {
  const ed = useEditor()
  const session = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  return (
    <Field
      aria-label={name}
      title={name}
      value={value}
      className="h-[24px]"
      onChange={(e) => {
        session.begin()
        onChange(e.currentTarget.value)
      }}
      onBlur={session.finish}
    />
  )
}
