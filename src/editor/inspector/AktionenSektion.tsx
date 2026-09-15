// Die Aktionsketten eines Bausteins im Inspector.
import { useState } from 'react'
import { Knopf } from '@/ui/werkbank/Knopf'
import type { BlockNode } from '../../core/blocks/BlockData'
import type { BlockEventSpec } from '../../core/blocks/faehigkeiten'
import { useEditor } from '../../state/useEditor'
import { KettenFenster } from '../zentrale/KettenFenster'

export function AktionenSektion({
  block,
  events,
}: {
  block: BlockNode
  events: readonly BlockEventSpec[]
}) {
  const ed = useEditor()

  const [offenesEreignis, setOffenesEreignis] = useState<BlockEventSpec | null>(null)

  const kette = (eventKey: string) => ed.tree[block.id]?.events?.[eventKey] ?? []

  return (
    <div className="flex flex-col gap-2">
      {events.map((ev) => {
        const steps = kette(ev.key)
        return (
          <div key={ev.key} className="flex min-h-steuer items-center justify-between gap-2">
            <span className="min-w-0 truncate text-ui text-tinte">
              {ev.name}
              {steps.length > 0 && (
                <span className="ml-1.5 tabular-nums text-matt">{steps.length}</span>
              )}
            </span>

            <Knopf onClick={() => setOffenesEreignis(ev)}>
              {steps.length === 0 ? 'Schritt anlegen' : 'Kette bearbeiten'}
            </Knopf>
          </div>
        )
      })}
      {offenesEreignis && (
        <KettenFenster
          block={block}
          eventKey={offenesEreignis.key}
          eventName={offenesEreignis.name}
          onClose={() => setOffenesEreignis(null)}
        />
      )}
    </div>
  )
}
