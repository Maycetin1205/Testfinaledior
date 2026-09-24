import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../../blocks/dialog/DialogFrame'
import { numberProperty, propertyVisible } from '../../core/block/property'
import type { LookupWindow } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import {
  blockElementInEditor,
  windowStateOf,
  openLookupInEditor,
  type WindowState,
} from '../canvas/lookupWindowState'
import { useEditor } from '../state/useEditor'
import { NumberControl } from '../controls/NumberControl'

const WIDTH = numberProperty({
  default: WINDOW_WIDTH,
  label: 'Breite',
  place: 'none',
  unit: 'px',
  min: 240,
  max: 1400,
})

const HEIGHT = numberProperty({
  default: WINDOW_HEIGHT,
  label: 'Höhe',
  place: 'none',
  unit: 'px',
  min: 160,
  max: 1000,
})

interface LookupWindowSectionProps {
  block: BlockNode
  window: LookupWindow
}

function slotsOf(block: BlockNode, window: LookupWindow): number[] {
  if (window.entriesProp === undefined) return [0]
  const raw = block.values[window.entriesProp]
  return Array.isArray(raw) ? raw.map((_, i) => i) : []
}

export function LookupWindowSection({ block, window }: LookupWindowSectionProps) {
  const ed = useEditor()

  const session = {
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }

  if (!propertyVisible(window.when, block.values)) return null

  const states = slotsOf(block, window)
    .map((slot) => ({ slot, state: windowStateOf(ed, block.id, window, slot) }))
    .filter((f): f is { slot: number; state: WindowState } => f.state !== null)

  const openLookupAt = (slot: number): void => {
    const el = blockElementInEditor(block.id, blockType(block.type)?.tag ?? '')
    if (el !== null) openLookupInEditor(ed, el, block.id, window, slot)
  }

  return (
    <div className="flex flex-col gap-2">
      {states.map(({ slot, state }) => (
        <div key={slot} className="flex min-w-0 flex-col gap-1">
          {window.entriesProp !== undefined && (
            <p className="text-ui font-medium text-ink">{state.title}</p>
          )}
          <p className="text-dense text-muted">
            {state.provided ? 'Spalten: ' : 'Automatisch: '}
            {state.columns.map((s) => (s.title === '' ? s.field : s.title)).join(', ')}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <NumberControl
              label="Breite"
              property={WIDTH}
              value={state.width}
              onChange={(v) => state.setMetrics('width', v)}
              {...session}
            />
            <NumberControl
              label="Höhe"
              property={HEIGHT}
              value={state.height}
              onChange={(v) => state.setMetrics('height', v)}
              {...session}
            />

            <Button onClick={() => openLookupAt(slot)}>Spalten im Fenster…</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
