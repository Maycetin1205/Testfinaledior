import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { Choice, type ChoiceOption } from '@/editor/widgets/Choice'
import { X } from '@/editor/icons/icon'
import { bindingWithSource, splitBinding } from '../../core/block/binding'
import { newFactor, numberStrict, numberText, DECIMALS_MAX, type Factor } from '../../core/data/calculation'
import { UNITS } from '../../core/data/units'
import type { SourceInReach } from '../../core/data/extraSources'
import type { ValueOrigin } from '../../core/data/valueOrigin'
import { OriginPicker } from '../controls/OriginPicker'
import type { OriginOffer } from '../controls/originOffer'

const UNIT_OPTIONS: ChoiceOption[] = UNITS.map((e) => ({ value: e.code, name: e.name }))

function columnsOptions(
  columns: readonly { key: string; title: string }[],
): ChoiceOption[] {
  return columns
    .filter((s) => s.key !== '')
    .map((s) => ({ value: s.key, name: s.title === '' ? s.key : s.title }))
}

function originOf(factor: Factor): ValueOrigin | null {
  if (factor.kind === 'column') return factor.column === '' ? null : { kind: 'row', value: factor.column }
  if (factor.kind === 'number') return { kind: 'fixed', value: numberText(factor.number, DECIMALS_MAX) }
  const { sourceId, code } = splitBinding(factor.field)
  return code === '' ? null : { kind: 'helper', sourceId, value: code }
}

function withOrigin(factor: Factor, origin: ValueOrigin): Factor | null {
  const { key, unit } = factor
  const name = factor.kind === 'column' ? '' : factor.name
  if (origin.kind === 'row') {
    return factor.kind === 'column'
      ? { ...factor, column: origin.value }
      : { ...newFactor(key), unit, result: false, column: origin.value }
  }
  if (origin.kind === 'helper') {
    return { kind: 'dataField', key, unit, name, field: bindingWithSource(origin.sourceId ?? '', origin.value) }
  }
  if (origin.kind !== 'fixed') return null
  const number = numberStrict(origin.value)
  return number === null ? null : { kind: 'number', key, unit, name, number }
}

interface FactorRowProps {
  factor: Factor
  columns: readonly { key: string; title: string }[]
  sources: readonly SourceInReach[]

  lead?: boolean
  onFactor: (factor: Factor) => void
  onRemove?: () => void
}

export function FactorRow({
  factor,
  columns,
  sources,
  lead = false,
  onFactor,
  onRemove,
}: FactorRowProps) {
  // A factor takes its value from a column of the row, a field of a helper
  // source or a fixed number.
  const offer: OriginOffer = {
    row: columnsOptions(columns),
    helpers: sources.slice(1).map((q) => ({
      sourceId: q.source.id,
      name: q.source.name,
      fields: q.source.fields.map((f) => ({ value: f.code, name: f.name === '' ? f.code : f.name, badge: f.code })),
    })),
    fixed: true,
  }

  return (
    <div className="flex flex-col gap-1.5 rounded border border-line p-2">
      <div className="flex items-center gap-1.5">
        {lead && factor.kind === 'column' && (
          <Choice
            options={columnsOptions(columns)}
            value={factor.column}
            emptyText="Spalte wählen"
            onChoose={(column) => onFactor({ ...factor, column })}
          />
        )}
        {!lead && (
          <OriginPicker
            name="Wert"
            className="w-56"
            origin={originOf(factor)}
            offer={offer}
            onChoose={(origin) => {
              const next = withOrigin(factor, origin)
              if (next !== null) onFactor(next)
            }}
          />
        )}

        {factor.kind !== 'column' && (
          <Field
            placeholder="Name"
            defaultValue={factor.name}
            onBlur={(e) => onFactor({ ...factor, name: e.currentTarget.value.trim() })}
          />
        )}

        <Choice
          className="w-32"
          options={UNIT_OPTIONS}
          value={factor.unit}
          onChoose={(unit) => onFactor({ ...factor, unit })}
        />

        {onRemove !== undefined && (
          <Button onlyIcon aria-label="Faktor entfernen" onClick={onRemove}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>

    </div>
  )
}
