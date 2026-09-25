import { Link2, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import { selectionSourceIdOf } from '../../core/block/treeQuery'
import { SELECTION_FOLLOW_PROP, type SelectionFollow } from '../../core/data/selectionFollow'
import { OriginPicker } from '../controls/OriginPicker'
import type { OriginOffer } from '../controls/originOffer'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { followOf } from './followOffer'
import { KeyPairRows } from './KeyPairRows'

interface SelectionFollowSectionProps {
  block: BlockNode

  // Waits for a click on another giver.
  onPick: () => void
}

// Whose selection the block follows, and below it the field pairs, where the
// rows are not fetched for the chosen row anyway.
export function SelectionFollowSection({ block, onPick }: SelectionFollowSectionProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const follow = followOf(block)
  if (!follow) return null

  const sourceOf = (n: BlockNode | undefined) =>
    library.find((s) => s.id === selectionSourceIdOf(n))
  const giver = ed.tree[follow.giverId]
  const giverName = giver ? blockName(giver, library) : ''
  const giverSource = sourceOf(giver)
  const ownSource = sourceOf(block)

  // The value of a pair is a column of the giver's chosen row.
  const offer: OriginOffer = {
    rows: giverSource
      ? [{
          sourceId: follow.giverId,
          name: `Gewählte Zeile ${giverName}`,
          fields: giverSource.fields.map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code })),
        }]
      : [],
  }

  function set(next: SelectionFollow[]): void {
    ed.updateProperty(block.id, SELECTION_FOLLOW_PROP, next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-control items-center gap-1.5">
        <span className="shrink-0 text-label font-semibold uppercase tracking-label text-muted">
          Folgt der Auswahl von
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{giverName}</span>
        <Button onlyIcon aria-label="Anderen Baustein wählen" title="Anderen Baustein wählen" onClick={onPick}>
          <Link2 size={13} />
        </Button>
        <Button onlyIcon aria-label="Folgt nicht mehr" title="Folgt nicht mehr" onClick={() => set([])}>
          <X size={13} />
        </Button>
      </div>
      {follow.pairs.length > 0 && (
        <KeyPairRows
          question="Verbindende Felder"
          pairs={follow.pairs}
          leftFields={[]}
          left={(pair, at) => (
            <OriginPicker
              name={`Wert ${at + 1}`}
              origin={pair.fromField === '' ? null : { kind: 'row', sourceId: follow.giverId, value: pair.fromField }}
              offer={offer}
              onChoose={(origin) => set([{
                ...follow,
                pairs: follow.pairs.map((p, x) => (x === at ? { ...p, fromField: origin.value } : p)),
              }])}
            />
          )}
          rightFields={ownSource?.fields ?? []}
          leftName={(at) => `Wert ${at + 1}`}
          rightName={(at) => `Feld ${at + 1} in diesem Baustein`}
          removeName={(at) => `Feldpaar ${at + 1} entfernen`}
          onChange={(keyPairs) => set([{ ...follow, pairs: keyPairs }])}
        />
      )}
    </div>
  )
}
