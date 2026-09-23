import { Plus, X } from '@/editor/icons/icon'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { ICON_MAX } from '../../core/data/dataSources'
import { EMPTY_ROW, type FieldRow } from './fieldRow'

const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_72px_72px_64px_auto] items-center gap-x-2'
const COLUMNS_NAMES = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px_auto] items-center gap-x-2'

interface FieldListProps {
  rows: FieldRow[]
  setRows: (next: FieldRow[]) => void
  rowsError: string[]
  doubleError: string
  showError: boolean

  columnsNames?: boolean
  columnsLabel?: string
}

export function FieldList({
  rows, setRows, rowsError, doubleError, showError, columnsNames = false,
  columnsLabel = 'Spalte im DataSet',
}: FieldListProps) {
  const grid = columnsNames ? COLUMNS_NAMES : COLUMNS
  const setRow = (at: number, patch: Partial<FieldRow>) =>
    setRows(rows.map((row, i) => (i === at ? { ...row, ...patch } : row)))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-dense font-semibold uppercase tracking-wide text-muted">Felder</span>
        <Button onClick={() => setRows([...rows, { ...EMPTY_ROW }])}>
          <Plus size={13} /> Feld
        </Button>
      </div>

      <div className={`${grid} text-dense text-muted`}>
        <span>Klarname</span>
        {columnsNames
          ? <span>{columnsLabel}</span>
          : <><span>Position</span><span>Länge</span></>}
        <span>Zeichen</span>
        <span />
      </div>
      {rows.map((z, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className={grid}>
            <Field
              aria-label={`Feld ${i + 1}: Klarname`}
              value={z.label}
              onChange={(e) => setRow(i, { label: e.target.value })}
            />
            {columnsNames ? (
              <Field
                aria-label={`Feld ${i + 1}: ${columnsLabel}`}
                value={z.rawCode}
                onChange={(e) => setRow(i, { rawCode: e.target.value })}
              />
            ) : (
              <>
                <Field
                  aria-label={`Feld ${i + 1}: Position`}
                  value={z.pos}
                  placeholder={z.rawCode !== '' ? '—' : undefined}
                  onChange={(e) => setRow(i, { pos: e.target.value })}
                />
                <Field
                  aria-label={`Feld ${i + 1}: Länge`}
                  value={z.len}
                  placeholder={z.rawCode !== '' ? '—' : undefined}
                  onChange={(e) => setRow(i, { len: e.target.value })}
                />
              </>
            )}
            <Field
              type="number"
              min={1}
              max={ICON_MAX}
              step={1}
              aria-label={`Feld ${i + 1}: Spaltenbreite in Zeichen`}
              value={z.icon}
              placeholder="—"
              onChange={(e) => setRow(i, { icon: e.target.value })}
            />
            <Button
              onlyIcon
              aria-label={`Feld ${i + 1} entfernen`}
              onClick={() => setRows(rows.filter((_, at) => at !== i))}
            >
              <X size={14} />
            </Button>
          </div>
          {showError && rowsError[i] !== '' && (
            <p className="text-dense text-error">{rowsError[i]}</p>
          )}
        </div>
      ))}
      {showError && doubleError !== '' && (
        <p className="text-dense text-error">{doubleError}</p>
      )}
    </div>
  )
}
