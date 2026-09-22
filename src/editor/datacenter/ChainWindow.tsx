import { useState } from 'react'
import { Plus } from '@/editor/icons/icon'
import { Dialog } from '@/editor/widgets/Dialog'
import { Button } from '@/editor/widgets/PushButton'
import { ListDetail } from '@/editor/widgets/ListDetail'
import type { BlockNode } from '../../core/block/tree'
import type { Step } from '../../core/data/actions'
import { blockName } from '../../core/block/blockName'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { StepList } from './StepList'
import { StepForm } from './StepForm'

interface ChainsWindowProps {
  block: BlockNode
  eventKey: string
  eventName: string
  onClose: () => void
}

export function ChainsWindow({ block, eventKey, eventName, onClose }: ChainsWindowProps) {
  const ed = useEditor()
  const sources = useDataSources()

  const [openId, setOpenId] = useState<string | null>(null)

  const [next, setNeu] = useState(false)

  const chain = ed.tree[block.id]?.chains?.[eventKey] ?? []
  const open = openId === null ? undefined : chain.find((s) => s.id === openId)

  const setChain = (steps: Step[]): void => {
    const node = ed.tree[block.id]
    if (!node) return
    ed.updateBlockEvents(block.id, { ...(node.chains ?? {}), [eventKey]: steps })
  }

  const save = (step: Step): void => {
    setChain(open ? chain.map((s) => (s.id === step.id ? step : s)) : [...chain, step])
    setNeu(false)
    setOpenId(step.id)
  }

  const detail = next
    ? <StepForm key="next" chain={chain} onClose={() => setNeu(false)} onSave={save} />
    : open
      ? (
          <StepForm
            key={open.id}
            step={open}
            chain={chain}
            onClose={() => setOpenId(null)}
            onSave={save}
          />
        )
      : (
          <p className="text-ui text-matt">
            {chain.length === 0 ? 'Noch kein Schritt. Lege links einen an.' : 'Schritt links wählen.'}
          </p>
        )

  return (
    <Dialog
      edgeless
      title={blockName(block, sources.list)}
      besideTitle={`${eventName} · ${chain.length} ${chain.length === 1 ? 'Schritt' : 'Schritte'}`}
      onClose={onClose}
    >
      <ListDetail
        listHead={
          <Button
            className="w-full"
            onClick={() => {
              setOpenId(null)
              setNeu(true)
            }}
          >
            <Plus size={13} /> Schritt
          </Button>
        }
        listWithoutEdge
        list={chain.length === 0
          ? <p className="px-3 py-3 text-ui text-matt">Noch kein Schritt.</p>
          : (
              <StepList
                steps={chain}
                activeId={openId ?? undefined}
                onChoose={(s) => {
                  setNeu(false)
                  setOpenId(s.id)
                }}
                onChange={setChain}
              />
            )}
        detail={detail}
      />
    </Dialog>
  )
}
