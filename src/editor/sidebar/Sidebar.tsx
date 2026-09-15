// Die linke Leiste des Editors.
import { ChevronDown } from '@/editor/zeichen/zeichen'
import { Knopf } from '@/editor/werkbank/Knopf'
import { BlockPalette } from './BlockPalette'

interface SidebarProps {
  offen: boolean
  onSchalte: (offen: boolean) => void
}

export function Sidebar({ offen, onSchalte }: SidebarProps) {
  if (!offen) {
    return (
      <div className="flex h-full flex-col items-center pt-1.5">
        <Knopf
          nurZeichen
          aria-label="Bausteine ausklappen"
          title="Bausteine ausklappen"
          onClick={() => onSchalte(true)}
        >
          <ChevronDown size={14} className="-rotate-90" />
        </Knopf>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <header className="flex h-steuer shrink-0 items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate text-ui font-semibold text-tinte">Bausteine</h2>
        <Knopf
          nurZeichen
          aria-label="Bausteine einklappen"
          title="Bausteine einklappen"
          onClick={() => onSchalte(false)}
        >
          <ChevronDown size={14} className="rotate-90" />
        </Knopf>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <BlockPalette />
      </div>
    </div>
  )
}
