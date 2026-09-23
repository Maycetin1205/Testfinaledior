import { Group } from '@/editor/widgets/Group'
import type { ListEntry } from '@/editor/widgets/List'
import type { BlockNode } from '../../core/block/tree'
import { selectionSourceIdOf, isSelectionGiver } from '../../core/block/treeQuery'
import {
  SELECTION_FOLLOW_PROP,
  selectionFollowsFrom,
  type SelectionFollow,
} from '../../core/data/selectionFollow'
import { loadRelationOf, sourcesKey } from '../../core/data/dataSources'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { blockName } from '../../core/block/blockName'
import { useSection } from './useSection'
import { PickerControl } from './controls/PickerControl'
import { KeyPairRows } from './KeyPairRows'

interface SelectionFollowSectionProps {
  block: BlockNode
}

export function SelectionFollowSection({ block }: SelectionFollowSectionProps) {
  const [open, toggle] = useSection('followsSelection')
  const ed = useEditor()
  const library = useDataSources().list

  const follow: SelectionFollow | undefined = selectionFollowsFrom(block.values[SELECTION_FOLLOW_PROP])[0]

  const candidates = Object.values(ed.tree).filter(
    (n) => n.id !== block.id && isSelectionGiver(n),
  )

  if (candidates.length === 0 && !follow) return null

  const sourceOf = (n: BlockNode | undefined) =>
    library.find((s) => s.id === selectionSourceIdOf(n))
  const ownSource = sourceOf(block)
  const giverNode = follow ? ed.tree[follow.giverId] : undefined
  const giverSource = sourceOf(giverNode)

  const fetchesRows = ownSource !== undefined && loadRelationOf(ownSource) !== null

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
      pairs: fetchesRows || keyPairs.length > 0 ? keyPairs : [{ ofField: '', toField: '' }],
    }])
  }
  return (
    <Group title="Auswahl folgen" open={open} onToggle={toggle}>

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
    </Group>
  )
}
