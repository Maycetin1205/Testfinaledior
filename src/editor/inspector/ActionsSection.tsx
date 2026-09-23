import { useState } from 'react'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import type { EventDef } from '../../core/block/capability'
import { useEditor } from '../state/useEditor'
import { ChainWindow } from '../datacenter/ChainWindow'

export function ActionsSection({
  block,
  events,
}: {
  block: BlockNode
  events: readonly EventDef[]
}) {
  const ed = useEditor()

  const [openEvent, setOpenEvent] = useState<EventDef | null>(null)

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

            <Button onClick={() => setOpenEvent(ev)}>
              {steps.length === 0 ? 'Schritt anlegen' : 'Kette bearbeiten'}
            </Button>
          </div>
        )
      })}
      {openEvent && (
        <ChainWindow
          block={block}
          eventKey={openEvent.key}
          eventName={openEvent.name}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </div>
  )
}
