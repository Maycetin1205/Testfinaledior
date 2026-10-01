import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ArrowUp, Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Field } from '@/editor/widgets/Field'
import { List } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import type { BlockNode } from '../../core/block/tree'
import type { EventDef } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { blockName } from '../../core/block/blockName'
import { isWindowPage, pagesOfMask } from '../../core/block/pages'
import {
  captureCarrierInTree,
  changeCarrierInTree,
  deleteCarrierInTree,
  selectionGiverInTree,
  valueSpotsInTree,
} from '../../core/block/treeQuery'
import type { RelationTemplate } from '../../core/data/relations'
import type { Step } from '../../core/data/steps/steps'
import { PickerControl } from '../controls/PickerControl'
import { useInputSession } from '../controls/useInputSession'
import {
  blockValueKey,
  captureOptions,
  selectionGiverOptions,
  VERB_SHORT,
  type BlockValueOption,
} from '../datacenter/parameterText'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { StepWindow, type StepContext, type StepTab } from './StepWindow'

// What "+ Schritt" offers. A relation and a tool open the step window; a
// popup step is one line.
const NEW_KINDS = [
  { value: 'RELATION', name: 'Relation' },
  { value: 'START_TOOL', name: 'Werkzeug starten' },
  { value: 'POPUP_OPEN', name: 'Popup öffnen' },
  { value: 'POPUP_CLOSE', name: 'Popup schließen' },
] as const

// The window that is open: for a step of the chain, or for a new one.
interface Opened {
  eventKey: string
  stepId: string | null
  tab: StepTab
  anchor: RefObject<HTMLElement | null>
}

// The actions of a block: per event its steps as lines. A relation or a tool
// opens its window on a click; a popup is chosen in its line.
export function ActionsSection({ block, events }: { block: BlockNode; events: readonly EventDef[] }) {
  const ed = useEditor()
  const relations = useRelations().list
  const sources = useDataSources().list
  const tree = ed.tree
  const [opened, setOpened] = useState<Opened | null>(null)

  const context: StepContext = useMemo(() => {
    const blockValues: BlockValueOption[] = valueSpotsInTree(tree).map(({ node, spot }) => {
      const name = blockName(node, sources)
      const severalSpots = (capability(blockType(node.type), 'actionValue')?.spots.length ?? 0) > 1
      return {
        key: blockValueKey(node.id, spot.prop),
        blockId: node.id,
        prop: spot.prop,
        label: severalSpots ? `${name} — ${spot.name}` : name,
      }
    })
    return {
      relations,
      choices: {
        dataSources: sources,
        blockValues,
        giver: selectionGiverOptions(selectionGiverInTree(tree), sources),
        captures: captureOptions(captureCarrierInTree(tree), sources),
        changes: captureOptions(changeCarrierInTree(tree), sources),
        deletions: captureOptions(deleteCarrierInTree(tree), sources),
      },
    }
  }, [tree, sources, relations])
  const popups = pagesOfMask(tree).filter(isWindowPage).map((p) => ({ value: p.id, name: p.name }))

  const chainOf = (key: string): Step[] => tree[block.id]?.chains?.[key] ?? []
  const setChain = (key: string, steps: Step[]): void => {
    const node = ed.tree[block.id]
    if (!node) return
    ed.updateBlockEvents(block.id, { ...(node.chains ?? {}), [key]: steps })
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {events.map((ev) => {
        const chain = chainOf(ev.key)
        const set = (steps: Step[]) => setChain(ev.key, steps)
        return (
          <section key={ev.key} className="flex flex-col gap-[4px]">
            <span className="text-dense font-semibold text-muted">{ev.name}</span>
            <div className="overflow-hidden rounded border border-line">
              {chain.map((step, i) => (
                <StepLine
                  key={step.id}
                  nr={i + 1}
                  step={step}
                  relations={relations}
                  popups={popups}
                  open={opened?.stepId === step.id}
                  onOpen={(anchor, tab) => setOpened({ eventKey: ev.key, stepId: step.id, tab, anchor })}
                  onChange={(next) => set(chain.map((s) => (s.id === step.id ? next : s)))}
                  onUp={i === 0 ? undefined : () => {
                    const next = [...chain]
                    next.splice(i - 1, 0, ...next.splice(i, 1))
                    set(next)
                  }}
                  onRemove={() => set(chain.filter((s) => s.id !== step.id))}
                />
              ))}
              <AddStep
                onWindow={(anchor, tab) => setOpened({ eventKey: ev.key, stepId: null, tab, anchor })}
                onPopup={(kind) => set([...chain, { id: crypto.randomUUID(), kind, resultName: '', popupId: '' }])}
              />
            </div>
            {opened?.eventKey === ev.key && (
              <StepWindow
                key={opened.stepId ?? 'new'}
                nr={opened.stepId === null ? chain.length + 1 : chain.findIndex((s) => s.id === opened.stepId) + 1}
                step={chain.find((s) => s.id === opened.stepId)}
                tab={opened.tab}
                chain={chain}
                context={context}
                anchor={opened.anchor}
                onApply={(next) => {
                  set(chain.some((s) => s.id === next.id)
                    ? chain.map((s) => (s.id === next.id ? next : s))
                    : [...chain, next])
                  setOpened(null)
                }}
                onClose={() => setOpened(null)}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}

const LINE = 'group flex h-[30px] items-center gap-[8px] border-b border-line/70 px-[8px]'

// One step as a line: its number, what it does, on the right its short form,
// and while the pointer is on it, up and remove.
function StepLine({ nr, step, relations, popups, open, onOpen, onChange, onUp, onRemove }: {
  nr: number
  step: Step
  relations: readonly RelationTemplate[]
  popups: readonly { value: string; name: string }[]
  open: boolean
  onOpen: (anchor: RefObject<HTMLElement | null>, tab: StepTab) => void
  onChange: (step: Step) => void
  onUp?: () => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
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
  const number = <span className="w-[16px] shrink-0 text-right font-mono text-dense text-muted">{nr}</span>

  switch (step.kind) {
    case 'RELATION': {
      const template = relations.find((r) => r.id === step.relationId)
      const tab: StepTab = template?.verb === 'GET_RELATION' ? 'GET' : 'PUT'
      return (
        <Clickable refEl={ref} open={open} onClick={() => onOpen(ref, tab)}>
          {number}
          <span className={cn('min-w-0 truncate', !template && 'text-muted')}>{template?.name ?? 'Relation'}</span>
          {template && (
            <span className="shrink-0 border-l border-line pl-[8px] font-mono text-dense text-muted">
              {VERB_SHORT[template.verb]} {template.nr}
            </span>
          )}
          {ends}
        </Clickable>
      )
    }
    case 'START_TOOL':
      return (
        <Clickable refEl={ref} open={open} onClick={() => onOpen(ref, 'TOOL')}>
          {number}
          <span className="min-w-0 truncate">Werkzeug starten</span>
          {step.toolNumber !== '' && (
            <span className="shrink-0 border-l border-line pl-[8px] font-mono text-dense text-muted">{step.toolNumber}</span>
          )}
          {ends}
        </Clickable>
      )
    case 'POPUP_OPEN':
    case 'POPUP_CLOSE':
      return (
        <div className={LINE}>
          {number}
          <span className="shrink-0">Popup</span>
          <PickerControl
            name="Popup"
            className="h-[24px] w-[150px]"
            groups={[{ key: 'popups', entries: popups }]}
            value={step.popupId}
            placeholder=""
            onChoose={(popupId) => onChange({ ...step, popupId })}
          />
          <span className="shrink-0">{step.kind === 'POPUP_OPEN' ? 'öffnen' : 'schließen'}</span>
          {ends}
        </div>
      )
    case 'BW_LINK':
      return (
        <div className={LINE}>
          {number}
          <span className="shrink-0">BW-Befehl</span>
          <InlineText name="Befehl" value={step.command} onChange={(command) => onChange({ ...step, command })} />
          {ends}
        </div>
      )
  }
}

function Clickable({ refEl, open, onClick, children }: {
  refEl: RefObject<HTMLDivElement | null>
  open: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <div
      ref={refEl}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className={cn(LINE, 'cursor-pointer hover:bg-control', open && 'bg-accent-soft shadow-mark')}
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

function AddStep({ onWindow, onPopup }: {
  onWindow: (anchor: RefObject<HTMLElement | null>, tab: StepTab) => void
  onPopup: (kind: 'POPUP_OPEN' | 'POPUP_CLOSE') => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-[30px] w-full items-center gap-[8px] px-[8px] text-left text-muted hover:bg-control hover:text-ink"
      >
        <Plus size={13} className="text-accent" /> Schritt hinzufügen
      </button>
      {open && (
        <Popover name="Schritt" anchor={button} width={200} onClose={() => setOpen(false)}>
          <List
            groups={[{ key: 'kinds', entries: NEW_KINDS.map((k) => ({ value: k.value, name: k.name })) }]}
            value=""
            onChoose={(kind) => {
              setOpen(false)
              if (kind === 'RELATION') onWindow(button, 'PUT')
              else if (kind === 'START_TOOL') onWindow(button, 'TOOL')
              else onPopup(kind as 'POPUP_OPEN' | 'POPUP_CLOSE')
            }}
          />
        </Popover>
      )}
    </>
  )
}
