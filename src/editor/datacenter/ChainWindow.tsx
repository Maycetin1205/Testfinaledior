import { useState } from 'react'
import { Plus } from '@/editor/icons/icon'
import { Dialog } from '@/editor/widgets/Dialog'
import { Button } from '@/editor/widgets/Button'
import { ListDetail } from '@/editor/widgets/ListDetail'
import type { BlockNode } from '../../core/block/tree'
import type { Step } from '../../core/data/actions'
import { blockName } from '../../core/block/blockName'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { StepList } from './StepList'
import { StepForm } from './StepForm'

interface ChainWindowProps {
  block: BlockNode
  eventKey: string
  eventName: string
  onClose: () => void
}

export function ChainWindow({ block, eventKey, eventName, onClose }: ChainWindowProps) {
  const ed = useEditor()
  const sources = useDataSources()

  const [openId, setOpenId] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)

  const chain = ed.tree[block.id]?.chains?.[eventKey] ?? []
  const open = openId === null ? undefined : chain.find((s) => s.id === openId)

  const setChain = (steps: Step[]): void => {
    const node = ed.tree[block.id]
    if (!node) return
    ed.updateBlockEvents(block.id, { ...(node.chains ?? {}), [eventKey]: steps })
  }

  const save = (step: Step): void => {
    setChain(open ? chain.map((s) => (s.id === step.id ? step : s)) : [...chain, step])
    setAdding(false)
    setOpenId(step.id)
  }

  const detail = adding
    ? <StepForm key="new" chain={chain} onClose={() => setAdding(false)} onSave={save} />
    : open && (
        <StepForm
          key={open.id}
          step={open}
          chain={chain}
          onClose={() => setOpenId(null)}
          onSave={save}
        />
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
              setAdding(true)
            }}
          >
            <Plus size={13} /> Schritt
          </Button>
        }
        listWithoutEdge
        list={chain.length > 0 && (
          <StepList
            steps={chain}
            activeId={openId ?? undefined}
            onChoose={(s) => {
              setAdding(false)
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
