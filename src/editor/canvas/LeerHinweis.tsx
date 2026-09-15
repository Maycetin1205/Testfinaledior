// Der Hinweis auf einer leeren Flaeche.
import { MousePointerClick } from '@/editor/zeichen/zeichen'
import type { ReactElement } from 'react'

// Liegt AUF der Maskenflaeche, ist aber Editor-Hilfe: darum Werkbank-Farben und
// gestrichelte Kante.
export function LeerHinweis({ titel }: { titel: string }): ReactElement {
  return (
    <div
      data-ff-editor-helper
      className="pointer-events-none flex flex-col items-center gap-1.5 rounded border border-dashed border-linie bg-panel/80 px-8 py-6 text-center font-sans"
    >
      <MousePointerClick size={18} aria-hidden className="text-matt" />
      <p className="text-ui font-medium text-tinte">{titel}</p>
      <p className="text-dicht text-matt">
        Zieh einen Baustein aus der Palette links hierher.
      </p>
    </div>
  )
}
