import { useKeyboardShortcuts } from '../state/useKeyboardShortcuts'
import { useView } from '../state/useView'
import { Canvas } from '../canvas/Canvas'
import { OpenCalculationWindow } from '../canvas/CalculationWindow'
import { OpenStepWindow } from '../actions/ActionsSection'
import { LookupColumns } from '../canvas/LookupColumns'
import { PageBar } from '../canvas/PageBar'
import { BlockPalette } from '../sidebar/BlockPalette'
import { DataWindow } from '../data/DataWindow'
import { MasksWindow } from '../masks/MasksWindow'
import { BarStrip } from '../bar/BarStrip'
import { Toolbar } from './Toolbar'

export function EditorShell() {
  useKeyboardShortcuts()
  const view = useView()

  return (
    <div className="flex h-screen w-screen flex-col bg-ground text-ink">
      <header className="flex shrink-0 items-center gap-[12px] overflow-x-auto border-b border-line-soft bg-panel px-[12px] py-[8px]">
        <Toolbar />
        <div className="flex-1" />
        <PageBar />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* As wide as .vnav; a white surface with a hairline at its edge. */}
        <aside className="w-[72px] shrink-0 overflow-y-auto border-r border-line-soft bg-panel">
          <BlockPalette />
        </aside>

        <BarStrip>
          <main className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--canvas-bg))] p-4">
            <Canvas />
          </main>
        </BarStrip>

      </div>

      {view.dataWindow && <DataWindow onClose={() => view.showData(false)} />}
      {view.masksWindow && <MasksWindow onClose={() => view.showMasks(false)} />}

      <LookupColumns />
      <OpenCalculationWindow />
      <OpenStepWindow />
    </div>
  )
}
