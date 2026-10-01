import { useRef, useState } from 'react'
import { FileUp } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Grid, GridLine, GridNewLine, Strip } from '@/editor/widgets/Grid'
import type { DataSource } from '../../core/data/dataSources'
import { dtkRead, type DtkTable } from '../../core/data/dtkImport'
import { sourcePreset } from '../../core/data/presets/presets'
import { useDataSources } from '../state/useDataSources'
import { DtkImport } from './DtkImport'
import { SourceSettings } from './SourceSettings'
import {
  codeReads,
  fieldFrom,
  lengthReads,
  nameTaken,
  newSource,
  tableKind,
  tableText,
  withEntry,
} from './sourceEdit'

const SOURCE_COLUMNS = [
  { name: 'Name' },
  { name: 'Tabelle', width: 110, mono: true },
]

const at = (v: readonly string[], k: number): string => v[k] ?? ''

// On the left the sources with name and table, on the right the marked one:
// its settings, then its fields. One source is always marked. Typed in the
// line; the last line of each list takes a new one.
export function SourcesTab() {
  const store = useDataSources()
  const [markedId, setMarkedId] = useState<string | null>(null)
  const [importing, setImporting] = useState<{ fileName: string; tables: DtkTable[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const marked = store.list.find((s) => s.id === markedId) ?? store.list[0]
  const taken = (name: string, except?: string) => nameTaken(store.list, name, except)

  async function dtkChosen(file: File) {
    let tables: DtkTable[]
    try {
      tables = dtkRead(new Uint8Array(await file.arrayBuffer()))
    } catch {
      tables = []
    }
    setImporting({ fileName: file.name, tables })
  }

  if (importing) {
    return <DtkImport fileName={importing.fileName} tables={importing.tables} onClose={() => setImporting(null)} />
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".dtk"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          try {
            if (file) void dtkChosen(file)
          } finally {
            e.target.value = ''
          }
        }}
      />
      <div className="flex w-[340px] shrink-0 flex-col border-r border-line">
        <Strip right={(
          <Button className="h-[22px] px-[8px] text-dense" onClick={() => fileRef.current?.click()}>
            <FileUp size={13} /> Aus DTK-Datei
          </Button>
        )}
        >
          Quellen
        </Strip>
        <Grid columns={SOURCE_COLUMNS} bin>
          {store.list.map((s) => (
            <GridLine
              key={s.id}
              cells={[s.name, tableText(s)]}
              marked={marked?.id === s.id}
              tips
              valid={(v) => at(v, 0).trim() !== '' && !taken(at(v, 0), s.id) && tableKind(at(v, 1), s) !== null}
              onMark={() => setMarkedId(s.id)}
              onSave={(v) => {
                const next = withEntry(s, { name: at(v, 0), table: at(v, 1) })
                if (next) store.update(s.id, next)
              }}
              onRemove={() => store.remove(s.id)}
            />
          ))}
          <GridNewLine
            names={['Neue Quelle, Name', 'Neue Quelle, Tabelle']}
            valid={(v) => !taken(at(v, 0)) && (at(v, 1).trim() === '' || tableKind(at(v, 1)) !== null)}
            onAdd={(v) => {
              const kind = tableKind(at(v, 1))
              if (at(v, 0).trim() === '' || taken(at(v, 0)) || !kind) return false
              setMarkedId(store.add(newSource(at(v, 0), kind)).id)
              return true
            }}
          />
        </Grid>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {marked && <SourcePart key={marked.id} source={marked} />}
      </div>
    </>
  )
}

function SourcePart({ source }: { source: DataSource }) {
  const store = useDataSources()
  const [markedAt, setMarkedAt] = useState<number | null>(null)
  const fields = source.fields
  const setFields = (next: DataSource['fields']) => {
    const changed = withEntry(source, { fields: next })
    if (changed) store.update(source.id, changed)
  }
  const codeFree = (code: string, except?: number) => !fields.some((f, k) => k !== except && f.code === code.trim())
  const columns = [
    { name: sourcePreset(source.preset).columnsLabel || 'Code', width: 110, mono: true },
    { name: 'Name' },
    { name: 'Max. Länge', width: 90, mono: true, right: true },
  ]

  return (
    <>
      <Strip>{source.name}</Strip>
      <SourceSettings source={source} />
      <Strip right={fields.length}>Felder</Strip>
      <Grid columns={columns} bin onEmpty={() => setMarkedAt(null)}>
        {fields.map((f, i) => (
          <GridLine
            key={`${i}:${f.code}`}
            cells={[f.code, f.name, f.length === undefined ? '' : String(f.length)]}
            marked={markedAt === i}
            tips
            valid={(v) => codeReads(at(v, 0)) && at(v, 1).trim() !== '' && lengthReads(at(v, 2)) && codeFree(at(v, 0), i)}
            onMark={() => setMarkedAt(i)}
            onSave={(v) => setFields(fields.map((o, k) => (k === i ? fieldFrom(at(v, 0), at(v, 1), at(v, 2)) : o)))}
            onRemove={() => {
              setFields(fields.filter((_, k) => k !== i))
              setMarkedAt(null)
            }}
          />
        ))}
        <GridNewLine
          names={['Neues Feld, Code', 'Neues Feld, Name', 'Neues Feld, Max. Länge']}
          valid={(v) => (at(v, 0).trim() === '' || (codeReads(at(v, 0)) && codeFree(at(v, 0)))) && lengthReads(at(v, 2))}
          onAdd={(v) => {
            if (!codeReads(at(v, 0)) || at(v, 1).trim() === '' || !lengthReads(at(v, 2)) || !codeFree(at(v, 0))) return false
            setFields([...fields, fieldFrom(at(v, 0), at(v, 1), at(v, 2))])
            return true
          }}
        />
      </Grid>
    </>
  )
}
