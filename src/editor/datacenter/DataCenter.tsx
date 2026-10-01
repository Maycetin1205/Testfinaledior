import { useRef, useState } from 'react'
import { FolderOpen, Save, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { loadLibraryFromFile, saveLibraryAsFile } from '../state/libraryFile'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { DataSourcesArea } from './DataSourcesArea'
import { RelationArea } from './RelationArea'

type Area = 'dataSources' | 'relation' | 'library'

// The data as a window: sources, relations, the library, each a tab.
export function DataCenter({ onClose }: { onClose: () => void }) {
  const [area, setArea] = useState<Area>('dataSources')
  const sources = useDataSources()
  const relation = useRelations()

  const tabs: ReadonlyArray<{ key: Area; name: string; count?: number }> = [
    { key: 'dataSources', name: 'Quellen', count: sources.list.length },
    { key: 'relation', name: 'Relationen', count: relation.list.length },
    { key: 'library', name: 'Bibliothek' },
  ]

  return (
    <section aria-label="Daten" data-ff-data-panel className="flex h-full min-h-0 flex-col">
      <header className="flex h-[44px] shrink-0 items-center gap-[14px] border-b border-line px-[14px]">
        <h2 className="text-title font-semibold text-ink">Daten</h2>
        <div className="flex-1" />
        <Button onlyIcon aria-label="Daten schließen" title="Schließen" onClick={onClose}>
          <X size={15} />
        </Button>
      </header>
      <nav className="flex shrink-0 border-b border-line bg-control px-[8px]">
        {tabs.map(({ key, name, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setArea(key)}
            className={cn(
              '-mb-px border-b-2 px-[14px] pb-[6px] pt-[7px]',
              area === key
                ? 'border-x border-x-line border-b-accent bg-panel font-semibold text-ink'
                : 'border-b-transparent text-muted hover:text-ink',
            )}
          >
            {name}
            {count !== undefined && <span className="ml-[6px] font-normal tabular-nums text-muted">{count}</span>}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        {area === 'dataSources' && <DataSourcesArea />}
        {area === 'relation' && <RelationArea />}
        {area === 'library' && <LibraryArea />}
      </div>
    </section>
  )
}

function LibraryArea() {
  const ed = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-start gap-2 p-[12px]">
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          try {
            if (file) void loadLibraryFromFile(ed, file)
          } finally {
            e.target.value = ''
          }
        }}
      />
      <Button onClick={() => saveLibraryAsFile(ed)}>
        <Save size={14} /> Bibliothek speichern
      </Button>
      <Button onClick={() => fileRef.current?.click()}>
        <FolderOpen size={14} /> Bibliothek laden…
      </Button>
    </div>
  )
}
