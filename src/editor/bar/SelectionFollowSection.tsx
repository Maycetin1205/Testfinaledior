import { Link2, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import { selectionSourceIdOf } from '../../core/block/treeQuery'
import type { KeyPair } from '../../core/data/extraSources'
import { SELECTION_FOLLOW_PROP, type SelectionFollow } from '../../core/data/selectionFollow'
import type { ValueOrigin } from '../../core/data/valueOrigin'
import { OriginPicker } from '../controls/OriginPicker'
import type { OriginOffer } from '../controls/originOffer'
import {
  fieldEntries,
  formFieldSpots,
  fromOutside,
  outsideOffer,
  outsideOrigin,
  outsidePair,
} from '../controls/outsideOrigin'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { followedName, followOf } from './followOffer'
import { KeyPairRows } from './KeyPairRows'

interface SelectionFollowSectionProps {
  block: BlockNode

  // Waits for a click on what to follow instead.
  onPick: () => void
}

// What the block follows, and below it the field pairs, where the rows are not
// fetched for the chosen row anyway. The value of a pair comes from the
// giver's chosen row, the open document or a form field.
export function SelectionFollowSection({ block, onPick }: SelectionFollowSectionProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const follow = followOf(block)
  if (!follow) return null

  const sourceOf = (n: BlockNode | undefined) =>
    library.find((s) => s.id === selectionSourceIdOf(n))
  const giver = ed.tree[follow.giverId]
  const giverSource = sourceOf(giver)
  const ownSource = sourceOf(block)
  const formFields = formFieldSpots(ed.tree, library, block.id)

  const offer: OriginOffer = {
    rows: giver && giverSource
      ? [{
          sourceId: follow.giverId,
          name: `Gewählte Zeile ${blockName(giver, library)}`,
          fields: fieldEntries(giverSource),
        }]
      : [],
    ...outsideOffer(library, formFields),
  }

  const originOf = (pair: KeyPair): ValueOrigin | null => (pair.fromField === ''
    ? null
    : outsideOrigin(pair) ?? { kind: 'row', sourceId: follow.giverId, value: pair.fromField })

  const pairFor = (origin: ValueOrigin, pair: KeyPair): KeyPair | null => (fromOutside(origin)
    ? outsidePair(origin, pair.toField, formFields)
    : { fromField: origin.value, toField: pair.toField })

  function set(next: SelectionFollow[]): void {
    ed.updateProperty(block.id, SELECTION_FOLLOW_PROP, next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-control items-center gap-1.5">
        <span className="shrink-0 text-label font-semibold uppercase tracking-label text-muted">
          Folgt
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">
          {followedName(follow, ed.tree, library)}
        </span>
        <Button onlyIcon aria-label="Anderes wählen" title="Anderes wählen" onClick={onPick}>
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
              origin={originOf(pair)}
              offer={offer}
              onChoose={(origin) => {
                const next = pairFor(origin, pair)
                if (next) set([{ ...follow, pairs: follow.pairs.map((p, x) => (x === at ? next : p)) }])
              }}
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
