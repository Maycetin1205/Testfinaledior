import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/PushButton'
import { Choice, type ChoiceOption } from '@/editor/widgets/Select'
import { NumberInput } from '@/editor/widgets/NumberInput'
import { X } from '@/editor/icons/icon'
import { bindingWithSource, splitBinding } from '../../core/block/binding'
import { newFactor, numberStrict, numberText, SPOTS_MAX, type Factor } from '../../core/data/calculation'
import { UNITS } from '../../core/data/units'
import type { SourceInReach } from '../../core/data/extraSources'

const KINDS: ChoiceOption[] = [
  { value: 'column', name: 'Spalte der Zeile' },
  { value: 'dataField', name: 'Feld des Datensatzes' },
  { value: 'number', name: 'Feste Zahl' },
]

const UNIT_OPTIONS: ChoiceOption[] = UNITS.map((e) => ({ value: e.code, name: e.name }))

function columnsOptions(
  columns: readonly { key: string; title: string }[],
): ChoiceOption[] {
  return columns
    .filter((s) => s.key !== '')
    .map((s) => ({ value: s.key, name: s.title === '' ? s.key : s.title }))
}

function fieldOptions(source: SourceInReach | undefined): ChoiceOption[] {
  return (source?.source.fields ?? []).map((f) => ({
    value: f.code,
    name: f.name === '' ? f.code : f.name,
    key: f.code,
  }))
}

function withKind(factor: Factor, kind: string): Factor {
  if (kind === factor.kind) return factor
  const { key, unit } = factor
  if (kind === 'dataField') return { kind: 'dataField', key, unit, name: '', field: '' }
  if (kind === 'number') return { kind: 'number', key, unit, name: '', number: 1 }
  return { ...newFactor(key), unit }
}

export interface FactorRowProps {
  factor: Factor
  columns: readonly { key: string; title: string }[]
  sources: readonly SourceInReach[]

  lead?: boolean
  onFactor: (factor: Factor) => void
  onAway?: () => void
}

export function FactorRow({
  factor,
  columns,
  sources,
  lead = false,
  onFactor,
  onAway,
}: FactorRowProps) {
  const target = factor.kind === 'dataField' ? splitBinding(factor.field) : { sourceId: '', code: '' }
  const source = sources.find((q) => q.source.id === target.sourceId)

  return (
    <div className="flex flex-col gap-1.5 rounded border border-linie p-2">
      <div className="flex items-center gap-1.5">
        {!lead && (
          <Choice
            className="w-44"
            options={KINDS}
            value={factor.kind}
            onChoose={(kind) => onFactor(withKind(factor, kind))}
          />
        )}

        {factor.kind === 'column' && (
          <Choice
            options={columnsOptions(columns)}
            value={factor.column}
            emptyText="Spalte wählen"
            onChoose={(column) => onFactor({ ...factor, column })}
          />
        )}

        {factor.kind !== 'column' && (
          <Field
            placeholder="Name, z. B. Behandlungsmenge"
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

        {onAway !== undefined && (
          <Button onlyIcon aria-label="Faktor entfernen" onClick={onAway}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {factor.kind === 'dataField' && (
        <div className="flex items-center gap-1.5">
          <Choice
            options={sources.map((q) => ({ value: q.source.id, name: q.source.name }))}
            value={target.sourceId}
            emptyText="Datenquelle wählen"
            onChoose={(id) => onFactor({ ...factor, field: bindingWithSource(id, target.code) })}
          />
          <Choice
            options={fieldOptions(source)}
            value={target.code}
            emptyText="Feld wählen"
            onChoose={(code) => onFactor({ ...factor, field: bindingWithSource(target.sourceId, code) })}
          />
        </div>
      )}

      {factor.kind === 'number' && (
        <NumberInput
          key={numberText(factor.number, SPOTS_MAX)}
          className="w-32"
          title="Feste Zahl, deutsch geschrieben"
          defaultValue={numberText(factor.number, SPOTS_MAX)}
          onBlur={(e) => {
            const number = numberStrict(e.currentTarget.value)
            if (number === null) e.currentTarget.value = numberText(factor.number, SPOTS_MAX)
            else if (number !== factor.number) onFactor({ ...factor, number })
          }}
        />
      )}
    </div>
  )
}
