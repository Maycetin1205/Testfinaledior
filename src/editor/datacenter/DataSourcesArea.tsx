import { useRef, useState } from 'react'
import { FileUp } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { SOURCES_DIVIDER } from '../../core/block/blockType'
import {
  aliasOf,
  choiceOf,
  keyDisplay,
  LENGTH_MAX,
  type DataField,
  type DataSource,
} from '../../core/data/dataSources'
import { dtkRead, type DtkTable } from '../../core/data/dtkImport'
import { sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { EMPTY_CHOICE, descriptorFor } from '../../core/data/presets/sourcePreset'
import { keyFromInput } from '../../core/data/sourceInput'
import type { Write } from '../../core/data/writes/writes'
import { useDataSources } from '../state/useDataSources'
import { DtkImportForm } from './DtkImportForm'
import { Line, NewLine, Strip, TH } from './GridLines'

// The kinds a table names by itself; every other kind keeps what it is.
const TABLE_KINDS: Readonly<Record<string, PresetId>> = {
  BEL: 'document',
  POS: 'documentItem',
  ADR: 'addressMaster',
  ART: 'itemMaster',
}
const BY_TABLE = new Set<PresetId>(['document', 'documentItem', 'addressMaster', 'itemMaster', 'idb', 'file'])
const IDB = /^(?:IDB)?(?:ID)?(\d{1,4})$/

// Positions hang under the document's header record, as SoftEngine lists them.
const POSITIONS_UNDER = 'BEL_0_11'

// What a typed table stands for: BEL, POS, ADR, ART, an IDB number, else
// another file. A source of another kind keeps its kind.
function tableKind(raw: string, current: DataSource | undefined): { preset: PresetId; tableId: string } | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (t === '') return null
  if (current && !BY_TABLE.has(current.preset)) {
    const key = sourcePreset(current.preset).key(raw)
    return key === '' ? null : { preset: current.preset, tableId: key }
  }
  const fixed = TABLE_KINDS[t]
  if (fixed) return { preset: fixed, tableId: t }
  const idb = IDB.exec(t)
  if (idb) return { preset: 'idb', tableId: `IDBID${idb[1].padStart(4, '0')}` }
  const key = keyFromInput(t, false)
  return key === '' ? null : { preset: 'file', tableId: key }
}

const tableText = (s: DataSource): string => keyDisplay(s.tableId)

// The record number is the field named so; a source that knows one keeps it.
function writeFor(preset: PresetId, fields: readonly DataField[], before: Write): Write {
  if (!sourcePreset(preset).writes) return { kind: 'none' }
  const named = fields.find((f) => aliasOf(f.name) === 'satznummer')
  if (named) return { kind: 'putRelation', recordField: named.code }
  if (before.kind === 'putRelation' && fields.some((f) => f.code === before.recordField)) return before
  return before.kind === 'putRelation' && fields.length === 0 ? before : { kind: 'none' }
}

function sourceWith(s: DataSource, change: Partial<Pick<DataSource, 'name' | 'preset' | 'tableId' | 'fields'>>): Omit<DataSource, 'id'> {
  const preset = change.preset ?? s.preset
  const fields = change.fields ?? s.fields
  const kind = preset === s.preset
    ? { order: s.order, delivery: s.delivery }
    : descriptorFor(sourcePreset(preset), {
        ...choiceOf(s),
        headerKey: preset === 'documentItem' ? POSITIONS_UNDER : '',
        openRecord: false,
        load: null,
      })
  const { id: _id, ...rest } = s
  void _id
  return {
    ...rest,
    ...change,
    preset,
    order: kind.order,
    delivery: kind.delivery,
    fields,
    write: writeFor(preset, fields, s.write),
  }
}

const fieldCodeOk = (code: string): boolean =>
  code !== '' && !code.includes(',') && !code.includes(SOURCES_DIVIDER)

// The most a field may hold; empty when the field takes what it gets.
const lengthOk = (raw: string): boolean => {
  const t = raw.trim()
  if (t === '') return true
  const n = Number(t)
  return Number.isInteger(n) && n >= 1 && n <= LENGTH_MAX
}

function fieldFrom(code: string, name: string, length: string): DataField {
  const t = length.trim()
  return { code: code.trim(), name: name.trim(), ...(t === '' ? {} : { length: Number(t) }) }
}

// The sources side by side with their fields: on the left the sources with
// name and table, on the right always the fields of the marked one with
// code, name and the most characters. Typed in the line; the last line of
// each list is empty for a new one.
export function DataSourcesArea() {
  const store = useDataSources()
  const [selectionId, setSelectionId] = useState<string | null>(null)
  const [importing, setImporting] = useState<{ fileName: string; tables: DtkTable[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // One source is always marked, so its fields always stand there.
  const selection = store.list.find((s) => s.id === selectionId) ?? store.list[0]

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
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-[12px]">
        <DtkImportForm fileName={importing.fileName} tables={importing.tables} onClose={() => setImporting(null)} />
      </div>
    )
  }

  const nameTaken = (name: string, except?: string): boolean =>
    store.list.some((s) => s.id !== except && aliasOf(s.name) === aliasOf(name))

  const saveSource = (s: DataSource, name: string, table: string): void => {
    const kind = tableKind(table, s)
    if (name.trim() === '' || nameTaken(name, s.id) || !kind) return
    if (name.trim() === s.name && kind.tableId === s.tableId && kind.preset === s.preset) return
    store.update(s.id, sourceWith(s, { name: name.trim(), ...kind }))
  }

  const addSource = (name: string, table: string): boolean => {
    const kind = tableKind(table, undefined)
    if (name.trim() === '' || nameTaken(name) || !kind) return false
    const entry = store.add({
      name: name.trim(),
      preset: kind.preset,
      tableId: kind.tableId,
      ...descriptorFor(sourcePreset(kind.preset), {
        ...EMPTY_CHOICE,
        headerKey: kind.preset === 'documentItem' ? POSITIONS_UNDER : '',
      }),
      fields: [],
    })
    setSelectionId(entry.id)
    return true
  }

  const setFields = (s: DataSource, fields: DataField[]): void => {
    store.update(s.id, sourceWith(s, { fields }))
  }

  const at = (v: readonly string[], k: number): string => v[k] ?? ''

  return (
    <div className="flex min-h-0 flex-1">
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
      <div className="flex w-[420px] shrink-0 flex-col border-r border-line">
        <Strip right={(
          <Button className="h-[22px] px-[8px] text-dense" onClick={() => fileRef.current?.click()}>
            <FileUp size={13} /> Aus DTK-Datei
          </Button>
        )}
        >
          Quellen
        </Strip>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-ui">
            <thead className="sticky top-0 z-[1]">
              <tr>
                <th className={TH}>Name</th>
                <th className={cn(TH, 'w-[130px]')}>Tabelle</th>
                <th className={cn(TH, 'w-control')} />
              </tr>
            </thead>
            <tbody>
              {store.list.map((s) => (
                <Line
                  key={`${s.id}:${s.name}:${s.tableId}`}
                  cells={[s.name, tableText(s)]}
                  names={['Name', 'Tabelle']}
                  mono={[false, true]}
                  valid={(v) => at(v, 0).trim() !== '' && !nameTaken(at(v, 0), s.id) && tableKind(at(v, 1), s) !== null}
                  active={selection?.id === s.id}
                  onSelect={() => setSelectionId(s.id)}
                  onSave={(v) => saveSource(s, at(v, 0), at(v, 1))}
                  onRemove={() => store.remove(s.id)}
                />
              ))}
              <NewLine
                names={['Neue Quelle, Name', 'Neue Quelle, Tabelle']}
                mono={[false, true]}
                valid={(v) => at(v, 0).trim() === ''
                  || (!nameTaken(at(v, 0)) && (at(v, 1).trim() === '' || tableKind(at(v, 1), undefined) !== null))}
                onAdd={(v) => addSource(at(v, 0), at(v, 1))}
              />
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Strip right={selection ? `${selection.fields.length} Felder` : undefined}>
          {selection ? `Felder von ${selection.name}` : 'Felder'}
        </Strip>
        {selection && (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed border-collapse text-ui">
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <th className={cn(TH, 'w-[140px]')}>Code</th>
                  <th className={TH}>Name</th>
                  <th className={cn(TH, 'w-[110px]')}>Max. Länge</th>
                  <th className={cn(TH, 'w-control')} />
                </tr>
              </thead>
              <tbody>
                {selection.fields.map((f, i) => (
                  <Line
                    key={`${selection.id}:${i}:${f.code}:${f.name}:${f.length ?? ''}`}
                    cells={[f.code, f.name, f.length === undefined ? '' : String(f.length)]}
                    names={['Code', 'Name', 'Max. Länge']}
                    mono={[true, false, true]}
                    valid={(v) => fieldCodeOk(at(v, 0).trim()) && at(v, 1).trim() !== '' && lengthOk(at(v, 2))
                      && !selection.fields.some((o, k) => k !== i && o.code === at(v, 0).trim())}
                    onSave={(v) => {
                      const next = fieldFrom(at(v, 0), at(v, 1), at(v, 2))
                      if (next.code === f.code && next.name === f.name && next.length === f.length) return
                      setFields(selection, selection.fields.map((o, k) => (k === i ? next : o)))
                    }}
                    onRemove={() => setFields(selection, selection.fields.filter((_, k) => k !== i))}
                  />
                ))}
                <NewLine
                  key={selection.id}
                  names={['Neues Feld, Code', 'Neues Feld, Name', 'Neues Feld, Max. Länge']}
                  mono={[true, false, true]}
                  valid={(v) => at(v, 0).trim() === ''
                    || (fieldCodeOk(at(v, 0).trim()) && lengthOk(at(v, 2))
                      && !selection.fields.some((o) => o.code === at(v, 0).trim()))}
                  onAdd={(v) => {
                    const next = fieldFrom(at(v, 0), at(v, 1), at(v, 2))
                    if (!fieldCodeOk(next.code) || next.name === '' || !lengthOk(at(v, 2))
                      || selection.fields.some((o) => o.code === next.code)) return false
                    setFields(selection, [...selection.fields, next])
                    return true
                  }}
                />
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
