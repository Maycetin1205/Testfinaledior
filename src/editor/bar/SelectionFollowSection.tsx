import type { ListEntry } from '@/editor/widgets/List'
import type { BlockNode } from '../../core/block/tree'
import { followOf, giversFor } from './followOffer'
import { selectionSourceIdOf } from '../../core/block/treeQuery'
import {
  SELECTION_FOLLOW_PROP,
  type SelectionFollow,
} from '../../core/data/selectionFollow'
import { sourcesKey } from '../../core/data/dataSources'
import { deliveryAdapter } from '../../core/data/deliveries/deliveries'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { blockName } from '../../core/block/blockName'
import { PickerControl } from '../controls/PickerControl'
import { KeyPairRows } from './KeyPairRows'

interface SelectionFollowSectionProps {
  block: BlockNode
}

export function SelectionFollowSection({ block }: SelectionFollowSectionProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const follow = followOf(block)
  const candidates = giversFor(ed.tree, block)

  const sourceOf = (n: BlockNode | undefined) =>
    library.find((s) => s.id === selectionSourceIdOf(n))
  const ownSource = sourceOf(block)
  const giverNode = follow ? ed.tree[follow.giverId] : undefined
  const giverSource = sourceOf(giverNode)

  const fetchesRows = ownSource !== undefined
    && deliveryAdapter(ownSource.delivery.kind).fetchOn === 'selection'

  const entry = (n: BlockNode): ListEntry => {
    const q = sourceOf(n)
    return q
      ? { value: n.id, name: `${blockName(n, library)} (${q.name})`, badge: sourcesKey(q) }
      : { value: n.id, name: blockName(n, library) }
  }

  function set(next: SelectionFollow[]): void {
    ed.updateProperty(block.id, SELECTION_FOLLOW_PROP, next)
  }
  function setGiver(v: string): void {
    if (v === '') {
      set([])
      return
    }
    const keyPairs = follow && follow.pairs.length > 0 ? follow.pairs : []
    set([{
      giverId: v,
      pairs: fetchesRows || keyPairs.length > 0 ? keyPairs : [{ fromField: '', toField: '' }],
    }])
  }
  return (
    <div className="flex flex-col gap-2">
      <PickerControl
        label="Folgt der Auswahl von"
        name="Folgt der Auswahl von"
        groups={[{ key: 'giver', entries: candidates.map(entry) }]}
        value={follow?.giverId ?? ''}
        emptyText="Keiner"
        onChoose={setGiver}
      />
      {follow && (
        <>
          <KeyPairRows
            question="Verbindende Felder"
            pairs={follow.pairs}
            leftFields={giverSource?.fields ?? []}
            rightFields={ownSource?.fields ?? []}
            leftName={(at) => `Feld ${at + 1} beim Auswahl-Geber`}
            rightName={(at) => `Feld ${at + 1} in diesem Baustein`}
            removeName={(at) => `Feldpaar ${at + 1} entfernen`}
            onChange={(keyPairs) => set([{ ...follow, pairs: keyPairs }])}
          />
        </>
      )}
    </div>
  )
}
