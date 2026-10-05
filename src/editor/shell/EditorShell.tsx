import { useEffect, useState } from 'react'
import { useKeyboardShortcuts } from '../state/useKeyboardShortcuts'
import { Canvas } from '../canvas/Canvas'
import { OpenCalculationWindow } from '../canvas/CalculationWindow'
import { OpenStepWindow } from '../actions/ActionsSection'
import { LookupColumns } from '../canvas/LookupColumns'
import { PageBar } from '../canvas/PageBar'
import { BlockPalette } from '../sidebar/BlockPalette'
import { DataWindow } from '../data/DataWindow'
import { onDataRequest } from '../data/openData'
import { Toolbar } from './Toolbar'

export function EditorShell() {
  useKeyboardShortcuts()

  // The data stay closed until „Daten" is clicked, then open as a window.
  const [dataOpen, setDataOpen] = useState(false)

  useEffect(() => onDataRequest(() => setDataOpen(true)), [])

  return (
    <div className="flex h-screen w-screen flex-col bg-ground text-ink">
      <header className="flex shrink-0 items-center gap-[12px] overflow-x-auto border-b border-line bg-panel px-[12px] py-[8px]">
        <Toolbar dataOpen={dataOpen} onData={() => setDataOpen(!dataOpen)} />
        <div className="flex-1" />
        <PageBar />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* As wide as .vnav. */}
        <aside className="w-[72px] shrink-0 overflow-y-auto bg-[hsl(var(--wb-nav))]">
          <BlockPalette />
        </aside>

        {/* Above the mask room for the bar of a block in its first row. */}
        <main className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--canvas-bg))] px-4 pb-4 pt-[20px]">
          <Canvas />
        </main>

      </div>

      {dataOpen && <DataWindow onClose={() => setDataOpen(false)} />}

      <LookupColumns />
      <OpenCalculationWindow />
      <OpenStepWindow />
    </div>
  )
}
