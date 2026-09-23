import { ChevronDown } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { BlockPalette } from './BlockPalette'

interface SidebarProps {
  open: boolean
  onToggle: (open: boolean) => void
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  if (!open) {
    return (
      <div className="flex h-full flex-col items-center pt-1.5">
        <Button
          onlyIcon
          aria-label="Bausteine ausklappen"
          title="Bausteine ausklappen"
          onClick={() => onToggle(true)}
        >
          <ChevronDown size={14} className="-rotate-90" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <header className="flex h-control shrink-0 items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">Bausteine</h2>
        <Button
          onlyIcon
          aria-label="Bausteine einklappen"
          title="Bausteine einklappen"
          onClick={() => onToggle(false)}
        >
          <ChevronDown size={14} className="rotate-90" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <BlockPalette />
      </div>
    </div>
  )
}
