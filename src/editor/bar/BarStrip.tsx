import { useState, type ReactNode } from 'react'
import { StripContext } from './useBarStrip'

// The strip under the toolbar that holds the bar of the chosen block or
// column: one fixed place, over nothing. Empty, it keeps its height. Below it
// what it is wrapped around, the canvas.
export function BarStrip({ children }: { children: ReactNode }) {
  const [strip, setStrip] = useState<HTMLElement | null>(null)
  return (
    <StripContext.Provider value={strip}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          ref={setStrip}
          data-ff-editor-helper
          className="flex h-[40px] shrink-0 items-center gap-[4px] overflow-x-auto whitespace-nowrap border-b border-line bg-panel px-[12px] text-ui text-ink"
        />
        {children}
      </div>
    </StripContext.Provider>
  )
}
