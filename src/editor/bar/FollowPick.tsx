import { FileText, Link2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { useCloseOnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { BlockNode } from '../../core/block/tree'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { openDocumentOf } from '../controls/outsideOrigin'
import { useDataSources } from '../state/useDataSources'
import { useView } from '../state/useView'
import { followOnDocument } from './followOffer'

// Waits for a click on what this block follows: a block with a chosen row or
// a form field on the canvas, or the open document beside the sign. Escape or
// a click on the canvas ends the waiting.
export function FollowPick({ block }: { block: BlockNode }) {
  const ed = useView()
  const openDocument = openDocumentOf(useDataSources().list)
  const waiting = ed.followPickFor === block.id
  return (
    <>
      <Button
        onlyIcon
        aria-label="Folgt der Auswahl"
        title="Folgt der Auswahl"
        aria-pressed={waiting}
        className={waiting ? 'border-accent bg-accent-soft text-ink' : undefined}
        onClick={() => ed.pickFollowFor(waiting ? null : block.id)}
      >
        <Link2 size={15} />
      </Button>
      {waiting && openDocument && (
        <Button
          onlyIcon
          aria-label={openDocument.name}
          title={openDocument.name}
          onClick={() => {
            ed.updateProperty(block.id, SELECTION_FOLLOW_PROP, followOnDocument(block, openDocument.id))
            ed.pickFollowFor(null)
          }}
        >
          <FileText size={15} />
        </Button>
      )}
      {waiting && <EscapeEnds onEscape={() => ed.pickFollowFor(null)} />}
    </>
  )
}

export function EscapeEnds({ onEscape }: { onEscape: () => void }) {
  useCloseOnEscape(onEscape)
  return null
}
