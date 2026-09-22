import { useState } from 'react'
import { Button } from '@/editor/widgets/PushButton'
import type { BlockNode } from '../../core/block/tree'
import type { EventDef } from '../../core/block/capability'
import { useEditor } from '../state/useEditor'
import { ChainsWindow } from '../datacenter/ChainWindow'

export function ActionsSection({
  block,
  events,
}: {
  block: BlockNode
  events: readonly EventDef[]
}) {
  const ed = useEditor()

  const [openEreignis, setOpenEreignis] = useState<EventDef | null>(null)

  const chain = (eventKey: string) => ed.tree[block.id]?.chains?.[eventKey] ?? []

  return (
    <div className="flex flex-col gap-2">
      {events.map((ev) => {
        const steps = chain(ev.key)
        return (
          <div key={ev.key} className="flex min-h-steuer items-center justify-between gap-2">
            <span className="min-w-0 truncate text-ui text-tinte">
              {ev.name}
              {steps.length > 0 && (
                <span className="ml-1.5 tabular-nums text-matt">{steps.length}</span>
              )}
            </span>

            <Button onClick={() => setOpenEreignis(ev)}>
              {steps.length === 0 ? 'Schritt anlegen' : 'Kette bearbeiten'}
            </Button>
          </div>
        )
      })}
      {openEreignis && (
        <ChainsWindow
          block={block}
          eventKey={openEreignis.key}
          eventName={openEreignis.name}
          onClose={() => setOpenEreignis(null)}
        />
      )}
    </div>
  )
}
