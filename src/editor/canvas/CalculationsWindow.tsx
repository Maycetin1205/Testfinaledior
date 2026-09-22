import { useEffect, useState } from 'react'
import { Dialog } from '@/editor/widgets/Dialog'
import { Button } from '@/editor/widgets/PushButton'
import { coerceColumns } from '../../blocks/behavior/columns'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { calculationsFrom, newCalculation, type Calculation } from '../../core/data/calculation'
import { sourcesInReach } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { CalculationDialog, type ColumnHead } from '../inspector/CalculationDialog'
import { useView } from '../state/useView'

export function CalculationsWindow() {
  const blockId = useView().calculationsFor
  if (blockId === null) return null

  return <Window key={blockId} blockId={blockId} />
}

function Window({ blockId }: { blockId: string }) {
  const ed = useEditor()
  const library = useDataSources().list
  const [chosen, setChosen] = useState<string | null>(null)

  const block = ed.getNode(blockId)
  const prop = block === undefined ? undefined : capability(blockType(block.type), 'compute')?.prop

  useEffect(() => {
    if (block === undefined || prop === undefined) ed.openCalculations(null)
  }, [ed, block, prop])
  if (block === undefined || prop === undefined) return null

  const calculations = calculationsFrom(block.values[prop])
  const columns: ColumnHead[] = coerceColumns(block.values.columns).map((s) => ({
    key: s.key,
    title: s.title,
  }))
  const sources = sourcesInReach(ed.tree, block.id, library)

  const set = (list: readonly Calculation[]): void => {
    ed.updateProperty(block.id, prop, list)
  }
  const make = (): void => {
    const next = newCalculation(calculations)
    set([...calculations, next])
    setChosen(next.key)
  }
  const close = (): void => ed.openCalculations(null)

  const current = calculations.find((b) => b.key === chosen) ?? calculations[0]
  if (current === undefined) {
    return (
      <Dialog
        title="Berechnungen"
        narrow
        foot={<Button kind="primary" onClick={close}>Fertig</Button>}
        onClose={close}
      >
        <div className="flex flex-col gap-3">
          <p className="text-ui text-matt">
            Noch keine Berechnung an dieser Erfassung. Eine Berechnung verbindet
            mehrere Spalten zu einer Gleichung: wer drei ihrer Größen ausfüllt,
            bekommt die vierte.
          </p>
          <Button kind="primary" className="self-start" onClick={make}>+ Berechnung</Button>
        </div>
      </Dialog>
    )
  }

  return (
    <CalculationDialog
      key={current.key}
      calculation={current}
      columns={columns}
      sources={sources}
      list={{
        calculations,
        onChoose: setChosen,
        onNeu: make,
        onAway: () => {
          set(calculations.filter((b) => b.key !== current.key))
          setChosen(null)
        },
      }}
      onCalculation={(next) => set(
        calculations.map((b) => (b.key === next.key ? next : b)),
      )}
      onClose={close}
    />
  )
}
