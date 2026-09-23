import { useState, type ReactNode } from 'react'
import { Checkbox } from '@/editor/widgets/Checkbox'
import { Dialog } from '@/editor/widgets/Dialog'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/PushButton'
import { Choice, type ChoiceOption } from '@/editor/widgets/Select'
import { NumberInput } from '@/editor/widgets/NumberInput'
import {
  allFactors,
  calculationFlaws,
  factorName,
  freeFactorKey,
  newFactor,
  computeCalculation,
  directionAsText,
  numberStrict,
  SPOTS_MAX,
  type Calculation,
  type Factor,
  type FactorState,
  type RoundingDirection,
  type ColumnsFactor,
} from '../../core/data/calculation'
import { unitShort } from '../../core/data/units'
import type { SourceInReach } from '../../core/data/extraSources'
import { FactorRow } from './CalculationFactor'

const DIRECTIONS: ChoiceOption[] = [
  { value: 'on', name: 'aufrunden' },
  { value: 'off', name: 'abrunden' },
  { value: 'kfm', name: 'kaufmännisch' },
]

export interface ColumnHead {
  key: string
  title: string
}

function Step({ number, title, children }: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-ui font-semibold text-ink">{number}. {title}</h3>
      {children}
    </section>
  )
}

function previewState(text: string | undefined): FactorState {
  const t = (text ?? '').trim()
  if (t === '') return { kind: 'empty' }
  const number = numberStrict(t)
  return number === null ? { kind: 'invalid', text: t } : { kind: 'number', number }
}

export interface CalculationList {
  calculations: readonly Calculation[]
  onChoose: (key: string) => void
  onAdd: () => void
  onRemove: () => void
}

export interface CalculationDialogProps {
  calculation: Calculation
  list?: CalculationList
  columns: readonly ColumnHead[]
  sources: readonly SourceInReach[]
  onCalculation: (b: Calculation) => void
  onClose: () => void
}

export function CalculationDialog({
  calculation,
  list,
  columns,
  sources,
  onCalculation,
  onClose,
}: CalculationDialogProps) {
  const [probes, setProbes] = useState<Record<string, string>>({})

  const titleOf = (key: string): string | null => {
    const s = columns.find((column) => column.key === key)
    return s === undefined ? null : (s.title === '' ? s.key : s.title)
  }
  const name = (f: Factor): string => factorName(f, (k) => titleOf(k) ?? '')

  const flaws = [...new Set(calculationFlaws(
    calculation,
    titleOf,
    (field) => (field === '' ? null : field),
  ))]

  const setFactor = (old: Factor, next: Factor): void => {
    const replace = (list: readonly Factor[]): Factor[] =>
      list.map((f) => (f.key === old.key ? next : f))
    if (calculation.lead.key === old.key && next.kind === 'column') {
      onCalculation({ ...calculation, lead: { ...next, result: true } })
      return
    }
    onCalculation({
      ...calculation,
      numerator: replace(calculation.numerator),
      denominator: replace(calculation.denominator),
    })
  }

  const removeFactor = (factor: Factor): void => {
    onCalculation({
      ...calculation,
      numerator: calculation.numerator.filter((f) => f.key !== factor.key),
      denominator: calculation.denominator.filter((f) => f.key !== factor.key),
    })
  }

  const addFactor = (part: 'numerator' | 'denominator'): void => {
    const factor = newFactor(freeFactorKey(calculation))
    onCalculation({ ...calculation, [part]: [...calculation[part], factor] })
  }

  const setResult = (f: ColumnsFactor, result: boolean): void => {
    setFactor(f, { ...f, result })
  }

  const columnsFactors = allFactors(calculation)
    .filter((f): f is ColumnsFactor => f.kind === 'column')

  const preview = computeCalculation(
    calculation,
    (f) => (f.kind === 'number' ? { kind: 'number', number: f.number } : previewState(probes[f.key])),
    (k) => titleOf(k) ?? '',
    flaws,
  )

  return (
    <Dialog
      title={calculation.name === '' ? 'Berechnung' : calculation.name}
      besideTitle={directionAsText(calculation, calculation.lead.key, (k) => titleOf(k) ?? '?')}
      foot={<Button kind="primary" onClick={onClose}>Fertig</Button>}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {list !== undefined && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Choice
              className="min-w-0 flex-1"
              aria-label="Berechnung wählen"
              options={list.calculations.map((b) => ({
                value: b.key,
                name: b.name === '' ? b.key : b.name,
              }))}
              value={calculation.key}
              onChoose={list.onChoose}
            />
            <Button onClick={list.onAdd}>+ Berechnung</Button>
            <Button kind="risk" onClick={list.onRemove}>Diese entfernen</Button>
          </div>
        )}

        <Step number={1} title="Name und Formel">
          <Field
            placeholder="Name der Berechnung"
            defaultValue={calculation.name}
            onBlur={(e) => onCalculation({ ...calculation, name: e.currentTarget.value.trim() })}
          />

          <span className="text-dense text-muted">Ergebnisgröße (links vom Gleichheitszeichen)</span>
          <FactorRow
            factor={calculation.lead}
            columns={columns}
            sources={sources}
            lead
            onFactor={(f) => setFactor(calculation.lead, f)}
          />

          <span className="text-dense text-muted">mal (Zähler)</span>
          {calculation.numerator.map((f) => (
            <FactorRow
              key={f.key}
              factor={f}
              columns={columns}
              sources={sources}
              onFactor={(next) => setFactor(f, next)}
              onRemove={() => removeFactor(f)}
            />
          ))}
          <Button onClick={() => addFactor('numerator')}>+ Faktor</Button>

          <span className="text-dense text-muted">geteilt durch (Nenner)</span>
          {calculation.denominator.map((f) => (
            <FactorRow
              key={f.key}
              factor={f}
              columns={columns}
              sources={sources}
              onFactor={(next) => setFactor(f, next)}
              onRemove={() => removeFactor(f)}
            />
          ))}
          <Button onClick={() => addFactor('denominator')}>+ Teiler</Button>
        </Step>

        <Step number={2} title="Rechenrichtungen und Rundung">
          {columnsFactors.map((f) => (
            <div key={f.key} className="flex flex-col gap-1 rounded border border-line p-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  className="min-w-0 flex-1"
                  checked={f.result}
                  disabled={f.key === calculation.lead.key}
                  onChange={() => setResult(f, !f.result)}
                >
                  {name(f)} berechnen
                </Checkbox>
                <NumberInput
                  unit="NK"
                  className="w-16"
                  min={0}
                  max={SPOTS_MAX}
                  value={f.round.spots}
                  onChange={(e) => {
                    const spots = Number.parseInt(e.target.value, 10)
                    if (Number.isInteger(spots) && spots >= 0 && spots <= SPOTS_MAX) {
                      setFactor(f, { ...f, round: { ...f.round, spots } })
                    }
                  }}
                />
                <Choice
                  className="w-auto"
                  options={DIRECTIONS}
                  value={f.round.direction}
                  onChoose={(direction) => setFactor(f, {
                    ...f,
                    round: { ...f.round, direction: direction as RoundingDirection },
                  })}
                />
              </div>
              {f.result && (
                <span className="text-dense text-muted">
                  {directionAsText(calculation, f.key, (k) => titleOf(k) ?? '?')}
                </span>
              )}
            </div>
          ))}
        </Step>

        <Step number={3} title="Vorschau">
          {allFactors(calculation).filter((f) => f.kind !== 'number').map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-ui">{name(f)}</span>
              <NumberInput
                className="w-28"
                unit={unitShort(f.unit)}
                value={probes[f.key] ?? ''}
                onChange={(e) => setProbes({ ...probes, [f.key]: e.target.value })}
              />
            </div>
          ))}
          {preview.kind === 'result' && (
            <p className="text-dense text-muted">
              {`${name(allFactors(calculation).find((f) => f.key === preview.key) ?? calculation.lead)} = ${preview.text} ${unitShort(
                allFactors(calculation).find((f) => f.key === preview.key)?.unit ?? '',
              )}`.trim()}
            </p>
          )}
        </Step>
      </div>
    </Dialog>
  )
}
