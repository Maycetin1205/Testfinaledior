import { blockName } from '../../core/block/blockName'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'

export function StatusBar() {
  const ed = useEditor()
  const sources = useDataSources().list
  const selected = ed.selectedNode
  const page = ed.pages.find((p) => p.id === ed.activePageId)

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-linie bg-panel px-3 text-dicht text-matt">
      <div className="flex items-center gap-3">
        <span>
          Bausteine (alle Seiten){' '}
          <strong className="font-semibold tabular-nums text-tinte">{ed.blockCount}</strong>
        </span>
        {selected && (
          <span>
            Auswahl{' '}
            <strong className="font-semibold text-tinte">
              {blockName(selected, sources)}
            </strong>
          </span>
        )}
      </div>
      {page && (
        <span>
          Seite <strong className="font-semibold text-tinte">{page.name}</strong>
        </span>
      )}
    </footer>
  )
}
