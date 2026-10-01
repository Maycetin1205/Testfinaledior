import { useRef, useState, type RefObject } from 'react'
import { FileUp, FolderOpen, Save } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Window } from '@/editor/widgets/Window'
import { dtkRead, type DtkTable } from '../../core/data/dtkImport'
import { loadLibraryFromFile, saveLibraryAsFile } from '../state/libraryFile'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { DtkImport } from './DtkImport'
import { RelationsTab } from './RelationsTab'
import { SourcesTab } from './SourcesTab'

type Tab = 'sources' | 'relations'

// A file chosen in a hidden file field; the field is emptied for the next one.
function FilePick({ accept, pickRef, onFile }: {
  accept: string
  pickRef: RefObject<HTMLInputElement | null>
  onFile: (file: File) => void
}) {
  return (
    <input
      ref={pickRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        try {
          if (file) onFile(file)
        } finally {
          e.target.value = ''
        }
      }}
    />
  )
}

// The data as a window: sources and relations as tabs in the head; beside
// them the import of a DTK file and the library, the customer file, saved and
// loaded.
export function DataWindow({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('sources')
  const [importing, setImporting] = useState<{ fileName: string; tables: DtkTable[] } | null>(null)
  const sources = useDataSources().list
  const relations = useRelations().list
  const ed = useEditor()
  const libraryRef = useRef<HTMLInputElement>(null)
  const dtkRef = useRef<HTMLInputElement>(null)

  async function dtkChosen(file: File) {
    let tables: DtkTable[]
    try {
      tables = dtkRead(new Uint8Array(await file.arrayBuffer()))
    } catch {
      tables = []
    }
    setTab('sources')
    setImporting({ fileName: file.name, tables })
  }

  return (
    <Window
      panel
      title="Daten"
      tabsInHead
      width={1040}
      height={720}
      tabs={[
        { key: 'sources', name: 'Quellen', count: sources.length },
        { key: 'relations', name: 'Relationen', count: relations.length },
      ]}
      tab={tab}
      onTab={(key) => {
        setImporting(null)
        setTab(key)
      }}
      buttons={(
        <>
          <FilePick accept=".dtk" pickRef={dtkRef} onFile={(file) => void dtkChosen(file)} />
          <FilePick accept=".json,application/json" pickRef={libraryRef} onFile={(file) => void loadLibraryFromFile(ed, file)} />
          <Button onClick={() => dtkRef.current?.click()}>
            <FileUp size={14} /> Import
          </Button>
          <Button onClick={() => saveLibraryAsFile(ed)}>
            <Save size={14} /> Bibliothek speichern
          </Button>
          <Button onClick={() => libraryRef.current?.click()}>
            <FolderOpen size={14} /> Bibliothek laden
          </Button>
        </>
      )}
      onClose={onClose}
    >
      {importing
        ? <DtkImport fileName={importing.fileName} tables={importing.tables} onClose={() => setImporting(null)} />
        : tab === 'sources' ? <SourcesTab /> : <RelationsTab />}
    </Window>
  )
}
