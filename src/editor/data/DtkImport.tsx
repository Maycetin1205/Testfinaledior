import { useState } from 'react'
import { Button } from '@/editor/widgets/Button'
import { Checkbox } from '@/editor/widgets/Checkbox'
import { cn } from '@/editor/widgets/cn'
import { Strip } from '@/editor/widgets/Grid'
import { keyDisplay } from '../../core/data/dataSources'
import type { DtkTable } from '../../core/data/dtkImport'
import { useDataSources } from '../state/useDataSources'
import { newSource } from './sourceEdit'

// The tables of a DTK file, each to be taken as an IDB source with its
// fields; a table already in the data stays as it is.
export function DtkImport({ fileName, tables, onClose }: {
  fileName: string
  tables: readonly DtkTable[]
  onClose: () => void
}) {
  const store = useDataSources()
  const present = new Set(store.list.map((s) => s.tableId).filter((k) => k !== ''))
  const [ticked, setTicked] = useState<ReadonlySet<string>>(
    () => new Set(tables.filter((t) => !present.has(t.key) && t.fields.length > 0).map((t) => t.key)),
  )
  const count = [...ticked].filter((k) => !present.has(k)).length

  const toggle = (key: string) => setTicked((old) => {
    const next = new Set(old)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const adopt = () => {
    for (const t of tables) {
      if (!ticked.has(t.key) || present.has(t.key)) continue
      store.add(newSource(t.name !== '' ? t.name : keyDisplay(t.key), { preset: 'idb', tableId: t.key }, t.fields))
    }
    onClose()
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Strip>{fileName}</Strip>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tables.map((t) => {
          const locked = present.has(t.key)
          return (
            <Checkbox
              key={t.key}
              checked={!locked && ticked.has(t.key)}
              disabled={locked}
              onChange={() => toggle(t.key)}
              className={cn('border-b border-line/70 px-[12px] py-[5px]', !locked && 'hover:bg-accent-soft')}
            >
              <span className="flex items-baseline gap-[8px]">
                <span className="truncate font-medium">{t.name !== '' ? t.name : keyDisplay(t.key)}</span>
                <span className="shrink-0 font-mono text-dense text-muted">{keyDisplay(t.key)}</span>
                <span className="ml-auto shrink-0 text-dense text-muted">{t.fields.length} Felder</span>
              </span>
            </Checkbox>
          )
        })}
      </div>
      <div className="flex shrink-0 justify-end gap-[8px] border-t border-line bg-control px-[14px] py-[8px]">
        <Button onClick={onClose}>Abbrechen</Button>
        {tables.length > 0 && (
          <Button kind="primary" disabled={count === 0} onClick={adopt}>
            {count === 1 ? '1 Tabelle übernehmen' : `${count} Tabellen übernehmen`}
          </Button>
        )}
      </div>
    </div>
  )
}
