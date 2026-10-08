import { PanelTop } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { useView } from '../state/useView'
import { EscapeEnds } from './FollowPick'

// Waits for a click on the area this block opens; a click on an area it
// opens already undoes that. Escape or a click on the canvas ends the waiting.
export function AreaPick({ block }: { block: BlockNode }) {
  const ed = useView()
  const waiting = ed.areaPickFor === block.id
  return (
    <>
      <Button
        onlyIcon
        aria-label="Öffnet Bereich"
        title="Öffnet Bereich"
        aria-pressed={waiting}
        className={waiting ? 'border-accent bg-accent-soft text-ink' : undefined}
        onClick={() => ed.pickAreaFor(waiting ? null : block.id)}
      >
        <PanelTop size={15} />
      </Button>
      {waiting && <EscapeEnds onEscape={() => ed.pickAreaFor(null)} />}
    </>
  )
}
