import { useRef, useState } from 'react'
import { Database, FolderOpen, Link2, Save } from '@/editor/icons/icon'
import { Dialog } from '@/editor/widgets/Dialog'
import { Entry } from '@/editor/widgets/Entry'
import { Button } from '@/editor/widgets/PushButton'
import { loadLibraryFromFile, saveLibraryAsFile } from '../state/libraryFile'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelation } from '../state/useRelations'
import { DataSourcesArea } from './DataSourcesSection'
import { RelationArea } from './RelationsSection'

type Area = 'dataSources' | 'relation'

const AREAS: ReadonlyArray<{ key: Area; name: string; icon: typeof Database }> = [
  { key: 'dataSources', name: 'Datenquellen', icon: Database },
  { key: 'relation', name: 'Relationen', icon: Link2 },
]

export function DataCenter({ onClose }: { onClose: () => void }) {
  const [area, setArea] = useState<Area>('dataSources')
  const sources = useDataSources()
  const relation = useRelation()

  const navNumber: Record<Area, string> = {
    dataSources: String(sources.list.length),
    relation: String(relation.list.length),
  }

  const areaBar = (
    <>
      {AREAS.map(({ key, name, icon }) => (
        <Entry
          key={key}
          icon={icon}
          name={name}
          active={area === key}
          onClick={() => setArea(key)}
          right={(
            <span className="shrink-0 text-dense tabular-nums text-muted">{navNumber[key]}</span>
          )}
        />
      ))}
    </>
  )

  return (
    <Dialog edgeless title="Datencenter" actions={<LibraryActions />} onClose={onClose}>
      {area === 'dataSources' && <DataSourcesArea areas={areaBar} />}
      {area === 'relation' && <RelationArea areas={areaBar} />}
    </Dialog>
  )
}

function LibraryActions() {
  const ed = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
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
        <FolderOpen size={14} /> Bibliothek laden…
      </Button>
    </>
  )
}
