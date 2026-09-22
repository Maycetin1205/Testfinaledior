import { useRef, useState, type ReactNode } from 'react'
import { FileUp, Plus, TriangleAlert } from '@/editor/icons/icon'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/PushButton'
import { ListDetail } from '@/editor/widgets/ListDetail'
import { Entry } from '@/editor/widgets/Entry'
import { Mark } from '@/editor/widgets/Badge'
import {
  sourceKind,
  sourcesKey,
  type DataSource,
} from '../../core/data/dataSources'
import { sourcesWording } from './wording'
import { dtkRead, type DtkTable } from '../../core/data/dtkImport'
import { blocksWithSource } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { DataSourceForm } from './DataSourceForm'
import { DtkImportForm } from './DtkImportForm'
import { blockName } from '../../core/block/blockName'
import { ikonFor } from './parameterText'

function copyName(name: string, assign: readonly string[]): string {
  const base = `${name} (Kopie)`
  if (!assign.includes(base)) return base
  let n = 2
  while (assign.includes(`${name} (Kopie ${n})`)) n += 1
  return `${name} (Kopie ${n})`
}

export function DataSourcesArea({ areas }: { areas?: ReactNode }) {
  const store = useDataSources()
  const ed = useEditor()
  const [selectionId, setSelectionId] = useState<string | null>(store.list[0]?.id ?? null)

  const [mode, setMode] = useState<'read' | 'edit' | 'next' | 'import'>('read')

  const [importState, setImportState] = useState<{
    fileName: string
    tables: DtkTable[]
    failuresBase?: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function dtkChosen(file: File) {
    let tables: DtkTable[]
    let failuresBase: string | undefined
    try {
      tables = dtkRead(new Uint8Array(await file.arrayBuffer()))
    } catch (error) {
      tables = []
      failuresBase = error instanceof Error ? error.message : String(error)
    }
    setImportState({ fileName: file.name, tables, failuresBase })
    setMode('import')
  }

  const selection = store.list.find((s) => s.id === selectionId) ?? store.list[0]

  const usageOf = (id: string): string[] =>
    blocksWithSource(ed.tree, id).map((n) => blockName(n, store.list))

  const incomplete = (s: DataSource): boolean =>
    sourceKind(s.kind).fieldsSingle && s.fields.length === 0

  const key = (s: DataSource): string => sourcesKey(s)

  function duplicate(s: DataSource) {
    const copy = store.add({
      ...s,
      name: copyName(s.name, store.list.map((q) => q.name)),
    })
    setSelectionId(copy.id)
    setMode('read')
  }

  function deleteEntry(s: DataSource) {
    store.remove(s.id)
    setMode('read')
  }

  return (
    <>
      <ListDetail
        areas={areas}
        listHead={(
          <>
          <Button className="w-full" onClick={() => setMode('next')}>
            <Plus size={14} /> Neue Datenquelle
          </Button>
          <Button className="w-full" onClick={() => fileRef.current?.click()}>
            <FileUp size={14} /> Aus SoftEngine-Datei…
          </Button>

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
          </>
        )}
        list={(
          <>
          {store.list.map((s) => {
            const used = usageOf(s.id).length
            const active =
              (mode === 'read' || mode === 'edit') && selection?.id === s.id
            const Icon = ikonFor(s.kind)
            return (
              <Entry
                key={s.id}
                icon={Icon}
                name={s.name}
                active={active}
                onClick={() => { setSelectionId(s.id); setMode('read') }}
                right={(
                  <>
                    {incomplete(s) && (
                      <TriangleAlert size={12} className="shrink-0 text-fehler" />
                    )}
                    <Mark technical={false}>{sourcesWording(s.kind).name}</Mark>
                  </>
                )}
                bottom={(
                  <>
                    {key(s) !== '' && (
                      <span className="font-mono">{key(s)} · </span>
                    )}
                    {s.fields.length} Felder · {used > 0 ? `verwendet von ${used}` : 'nicht verwendet'}
                  </>
                )}
              />
            )
          })}
          {store.list.length === 0 && (
            <p className="px-1 py-2 text-dicht text-matt">
              Noch keine Datenquellen.
            </p>
          )}
          </>
        )}
        detail={(
          <>
        {mode === 'next' && (
          <DataSourceForm onClose={() => setMode('read')} />
        )}
        {mode === 'import' && importState && (
          <DtkImportForm
            fileName={importState.fileName}
            tables={importState.tables}
            failuresBase={importState.failuresBase}
            onClose={() => setMode('read')}
          />
        )}
        {mode === 'edit' && selection && (
          <DataSourceForm source={selection} onClose={() => setMode('read')} />
        )}
        {mode === 'read' && !selection && (
          <p className="text-dicht text-matt">Keine Datenquelle gewählt.</p>
        )}
        {mode === 'read' && selection && (
          <div className="flex flex-col gap-4 text-ui">
            <div>
              <h3 className="text-ui font-semibold text-tinte">{selection.name}</h3>
              <p className="text-matt">
                {sourcesWording(selection.kind).name}
                {key(selection) !== '' ? ` · ${key(selection)}` : ''}
              </p>
            </div>

            <Group title="Felder">
              <div className="overflow-hidden rounded border border-linie">
                <table className="w-full">
                  <tbody>
                    {selection.fields.map((f) => (
                      <tr key={f.code} className="border-b border-linie last:border-b-0">
                        <td className="px-2.5 py-1">{f.name}</td>
                        <td className="px-2.5 py-1 text-right font-mono text-dicht text-matt">
                          {f.code}
                        </td>
                      </tr>
                    ))}
                    {selection.fields.length === 0 && (
                      <tr><td className="px-2.5 py-1 text-matt">Keine Felder.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Group>

            <Group title="Verwendung in dieser Maske">
              {usageOf(selection.id).length === 0 ? (
                <p className="text-matt">Von keinem Baustein verwendet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {usageOf(selection.id).map((name, i) => (
                    <li key={i} className="rounded border border-linie bg-control px-2.5 py-1">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <div className="flex gap-2 border-t border-linie pt-3">
              <Button kind="primary" onClick={() => setMode('edit')}>Bearbeiten</Button>
              <Button onClick={() => duplicate(selection)}>Duplizieren</Button>
              <Button kind="risk" onClick={() => deleteEntry(selection)}>Löschen</Button>
            </div>
          </div>
        )}
          </>
        )}
      />
    </>
  )
}
