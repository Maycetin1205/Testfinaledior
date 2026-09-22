import { MousePointerClick } from '@/editor/icons/icon'
import type { ReactElement } from 'react'

export function EmptyHint({ title }: { title: string }): ReactElement {
  return (
    <div
      data-ff-editor-helper
      className="pointer-events-none flex flex-col items-center gap-1.5 rounded border border-dashed border-linie bg-panel/80 px-8 py-6 text-center font-sans"
    >
      <MousePointerClick size={18} aria-hidden className="text-matt" />
      <p className="text-ui font-medium text-tinte">{title}</p>
      <p className="text-dicht text-matt">
        Zieh einen Baustein aus der Palette links hierher.
      </p>
    </div>
  )
}
