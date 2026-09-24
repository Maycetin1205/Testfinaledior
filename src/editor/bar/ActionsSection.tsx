import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import type { EventDef } from '../../core/block/capability'
import { useEditor } from '../state/useEditor'

export function ActionsSection({
  block,
  events,
  onOpen,
}: {
  block: BlockNode
  events: readonly EventDef[]
  onOpen: (event: EventDef) => void
}) {
  const ed = useEditor()

  const chain = (eventKey: string) => ed.tree[block.id]?.chains?.[eventKey] ?? []

  return (
    <div className="flex flex-col gap-2">
      {events.map((ev) => {
        const steps = chain(ev.key)
        return (
          <div key={ev.key} className="flex min-h-control items-center justify-between gap-2">
            <span className="min-w-0 truncate text-ui text-ink">
              {ev.name}
              {steps.length > 0 && (
                <span className="ml-1.5 tabular-nums text-muted">{steps.length}</span>
              )}
            </span>

            <Button onClick={() => onOpen(ev)}>
              {steps.length === 0 ? 'Schritt anlegen' : 'Kette bearbeiten'}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
