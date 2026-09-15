// Der Balken unter der Leinwand: Stand und Meldungen.
import { bausteinName } from '../../kern/maske/bausteinName'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'

export function StatusBar() {
  const ed = useEditor()
  const quellen = useDataSources().list
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
              {bausteinName(selected, quellen)}
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
