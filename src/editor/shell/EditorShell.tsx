import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Divider } from '@/editor/widgets/Separator'
import { useKeyboardShortcuts } from '../state/useKeyboardShortcuts'
import { Canvas } from '../canvas/Canvas'
import { CalculationsWindow } from '../canvas/CalculationsWindow'
import { WindowColumns } from '../canvas/LookupColumns'
import { PagesBar } from '../canvas/PageBar'
import { Inspector } from '../inspector/Inspector'
import { Sidebar } from '../sidebar/Sidebar'
import { DataCenter } from '../datacenter/DataCenter'
import { onDataCenterWish } from '../datacenter/openDataCenter'
import {
  clampWidth,
  WIDTHS_STEP,
  INSPECTOR_MAX,
  INSPECTOR_MIN,
  readWidth,
  rememberWidth,
  startWidthsDrag,
} from './inspectorWidth'
import { StatusBar } from './StatusBar'
import { Toolbar, HistoryButtons } from './Toolbar'

export function EditorShell() {
  useKeyboardShortcuts()

  const [dataCenterOpen, setDataCenterOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(true)

  useEffect(() => onDataCenterWish(() => setDataCenterOpen(true)), [])

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
    <div className="flex h-screen w-screen flex-col bg-grund text-tinte">
      <header className="flex shrink-0 flex-col border-b border-linie bg-panel">
        <div className="flex min-h-11 items-center gap-3 overflow-x-auto px-3 py-1">
          <span className="shrink-0 text-ui font-semibold">Aufbau-Editor</span>
          <Divider vertical />
          <HistoryButtons />
          <div className="flex-1" />
          <Toolbar onDataCenter={() => setDataCenterOpen(true)} />
        </div>
        <div className="flex min-h-9 items-center gap-4 border-t border-linie px-3">
          <PagesBar />
        </div>
      </header>

      {dataCenterOpen && <DataCenter onClose={() => setDataCenterOpen(false)} />}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${paletteOpen ? 'w-60' : 'w-9'} shrink-0 overflow-hidden border-r border-linie bg-panel`}
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
          title="Breite ziehen"
          className="w-1.5 shrink-0 cursor-col-resize border-l border-linie bg-panel transition-colors hover:bg-akzent focus-visible:bg-akzent focus-visible:outline-none"
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

      <StatusBar />

      <WindowColumns />
      <CalculationsWindow />
    </div>
  )
}
