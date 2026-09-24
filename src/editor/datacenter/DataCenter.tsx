import { useRef, useState } from 'react'
import { FolderOpen, Save, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Tabs } from '@/editor/widgets/Tabs'
import { loadLibraryFromFile, saveLibraryAsFile } from '../state/libraryFile'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { DataSourcesArea } from './DataSourcesArea'
import { RelationArea } from './RelationArea'

type Area = 'dataSources' | 'relation' | 'library'

// The data at the right of the canvas: sources, relations, the library. It is
// no window over the mask; the mask stays at hand beside it.
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
      <header className="flex h-[40px] shrink-0 items-center gap-0.5 border-b border-line px-[6px]">
        {tabs.map(({ key, name, count }) => (
          <Tabs key={key} active={area === key} onClick={() => setArea(key)}>
            {name}
            {count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{count}</span>}
          </Tabs>
        ))}
        <div className="flex-1" />
        <Button onlyIcon aria-label="Daten schließen" title="Schließen" onClick={onClose}>
          <X size={15} />
        </Button>
      </header>

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
