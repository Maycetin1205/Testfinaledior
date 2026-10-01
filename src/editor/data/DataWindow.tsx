import { useRef, useState } from 'react'
import { FolderOpen, Save } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Window } from '@/editor/widgets/Window'
import { loadLibraryFromFile, saveLibraryAsFile } from '../state/libraryFile'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { RelationsTab } from './RelationsTab'
import { SourcesTab } from './SourcesTab'

type Tab = 'sources' | 'relations'

// The data as a window: sources and relations as tabs, the library, which is
// the customer file, saved and loaded at the top.
export function DataWindow({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('sources')
  const sources = useDataSources().list
  const relations = useRelations().list
  const ed = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Window
      panel
      title="Daten"
      width={1040}
      height={720}
      tabs={[
        { key: 'sources', name: 'Quellen', count: sources.length },
        { key: 'relations', name: 'Relationen', count: relations.length },
      ]}
      tab={tab}
      onTab={setTab}
      buttons={(
        <>
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
            <FolderOpen size={14} /> Bibliothek laden
          </Button>
        </>
      )}
      onClose={onClose}
    >
      {tab === 'sources' ? <SourcesTab /> : <RelationsTab />}
    </Window>
  )
}
