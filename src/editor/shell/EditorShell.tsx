import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useKeyboardShortcuts } from '../state/useKeyboardShortcuts'
import { Canvas } from '../canvas/Canvas'
import { CalculationsWindow } from '../canvas/CalculationsWindow'
import { LookupColumns } from '../canvas/LookupColumns'
import { PageBar } from '../canvas/PageBar'
import { Inspector } from '../inspector/Inspector'
import { Sidebar } from '../sidebar/Sidebar'
import { DataCenter } from '../datacenter/DataCenter'
import { onDataCenterRequest } from '../datacenter/openDataCenter'
import {
  clampWidth,
  WIDTHS_STEP,
  INSPECTOR_MAX,
  INSPECTOR_MIN,
  readWidth,
  rememberWidth,
  startWidthsDrag,
} from './inspectorWidth'
import { Toolbar } from './Toolbar'

export function EditorShell() {
  useKeyboardShortcuts()

  const [dataCenterOpen, setDataCenterOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(true)

  useEffect(() => onDataCenterRequest(() => setDataCenterOpen(true)), [])

  const [inspectorWidth, setInspectorWidth] = useState(readWidth)

  const setAndRemember = (width: number): void => {
    setInspectorWidth(width)
    rememberWidth(width)
  }

  const onHandleKey = (e: ReactKeyboardEvent<HTMLElement>): void => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const dx = e.key === 'ArrowLeft' ? WIDTHS_STEP : -WIDTHS_STEP
    setAndRemember(clampWidth(inspectorWidth + dx))
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-ground text-ink">
      <header className="flex shrink-0 items-center gap-[12px] overflow-x-auto border-b border-line bg-panel px-[12px] py-[8px]">
        <Toolbar onData={() => setDataCenterOpen(true)} />
        <div className="flex-1" />
        <PageBar />
      </header>

      {dataCenterOpen && <DataCenter onClose={() => setDataCenterOpen(false)} />}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${paletteOpen ? 'w-60' : 'w-9'} shrink-0 overflow-hidden border-r border-line bg-panel`}
        >
          <Sidebar open={paletteOpen} onToggle={setPaletteOpen} />
        </aside>

        <main className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--canvas-bg))] p-4">
          <Canvas />
        </main>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Breite des Inspectors"
          aria-valuenow={inspectorWidth}
          aria-valuemin={INSPECTOR_MIN}
          aria-valuemax={INSPECTOR_MAX}
          tabIndex={0}
          className="w-1.5 shrink-0 cursor-col-resize border-l border-line bg-panel transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          onPointerDown={(e) => startWidthsDrag(e, inspectorWidth, setInspectorWidth, setAndRemember)}
          onKeyDown={onHandleKey}
        />
        <aside
          style={{ width: inspectorWidth }}
          className="shrink-0 overflow-hidden bg-panel"
        >
          <Inspector />
        </aside>
      </div>

      <LookupColumns />
      <CalculationsWindow />
    </div>
  )
}
