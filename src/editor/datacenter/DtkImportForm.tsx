import { useState } from 'react'
import { cn } from '@/editor/widgets/cn'
import { Checkbox } from '@/editor/widgets/Checkbox'
import { Button } from '@/editor/widgets/PushButton'
import { Field } from '@/editor/widgets/Field'
import { Row } from '@/editor/widgets/Row'
import { keyDisplay } from '../../core/data/dataSources'
import type { DtkTable } from '../../core/data/dtkImport'
import { useDataSources } from '../state/useDataSources'
import { FormCard } from './FormCard'

interface DtkImportFormProps {
  fileName: string
  tables: DtkTable[]
  onClose: () => void
}

export function DtkImportForm({ fileName, tables, onClose }: DtkImportFormProps) {
  const store = useDataSources()

  const present = new Set(
    store.list.map((s) => s.idbId).filter((k): k is string => typeof k === 'string'),
  )

  const [ticked, setTicked] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        tables
          .filter((t) => !present.has(t.key) && t.fields.length > 0)
          .map((t) => t.key),
      ),
  )

  const [recordField, setRecordField] = useState('')
  const recordFieldMissing = recordField.trim() === ''

  function toggle(key: string) {
    setTicked((old) => {
      const next = new Set(old)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function adopt() {
    if (recordFieldMissing) return
    for (const t of tables) {
      if (!ticked.has(t.key) || present.has(t.key)) continue
      store.add({
        name: t.name !== '' ? t.name : keyDisplay(t.key),
        kind: 'idb',
        idbId: t.key,

        recordField: recordField.trim(),
        fields: t.fields,
      })
    }
    onClose()
  }

  const count = [...ticked].filter((k) => !present.has(k)).length

  return (
    <FormCard title={`Import aus ${fileName}`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-ui">
        {tables.length > 0 && (
          <div className="overflow-hidden rounded border border-line">
            {tables.map((t) => {
              const locked = present.has(t.key)
              return (
                <Checkbox
                  key={t.key}
                  checked={!locked && ticked.has(t.key)}
                  disabled={locked}
                  onChange={() => toggle(t.key)}
                  className={cn(
                    'border-b border-line px-2.5 py-1.5 last:border-b-0',
                    !locked && 'hover:bg-control',
                  )}
                >
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate font-medium text-ink">
                      {t.name !== '' ? t.name : keyDisplay(t.key)}
                    </span>
                    <span className="shrink-0 font-mono text-dense text-muted">
                      {keyDisplay(t.key)}
                    </span>
                  </span>
                  <span className="block text-dense text-muted">
                    {t.fields.length} Felder
                  </span>
                </Checkbox>
              )
            })}
          </div>
        )}
        {tables.length > 0 && (
          <Row label="Satzfeld">
            {(f) => (
              <Field
                {...f}
                value={recordField}
                onChange={(e) => setRecordField(e.target.value)}
              />
            )}
          </Row>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button onClick={onClose}>Abbrechen</Button>
          {tables.length > 0 && (
            <Button kind="primary" disabled={count === 0 || recordFieldMissing} onClick={adopt}>
              {count === 1 ? '1 Tabelle übernehmen' : `${count} Tabellen übernehmen`}
            </Button>
          )}
        </div>
      </div>
    </FormCard>
  )
}
