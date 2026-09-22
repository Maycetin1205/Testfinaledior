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
  unitsProbe,
  resultFactors,
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

function Step({ nr, title, hint, children }: {
  nr: number
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-ui font-semibold text-tinte">{nr}. {title}</h3>
      {hint !== undefined && <p className="text-dicht text-matt">{hint}</p>}
      {children}
    </section>
  )
}

function previewState(text: string | undefined): FactorState {
  const t = (text ?? '').trim()
  if (t === '') return { kind: 'empty' }
  const number = numberStrict(t)
  return number === null ? { kind: 'ungueltig', text: t } : { kind: 'number', number }
}

export interface CalculationList {
  calculations: readonly Calculation[]
  onChoose: (key: string) => void
  onNeu: () => void
  onAway: () => void
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
    const s = columns.find((sp) => sp.key === key)
    return s === undefined ? null : (s.title === '' ? s.key : s.title)
  }
  const name = (f: Factor): string => factorName(f, (k) => titleOf(k) ?? '')

  const flaws = [...new Set(calculationFlaws(
    calculation,
    titleOf,
    (field) => (field === '' ? null : field),
  ))]
  const probe = unitsProbe(calculation)

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

  const factorAway = (away: Factor): void => {
    onCalculation({
      ...calculation,
      numerator: calculation.numerator.filter((f) => f.key !== away.key),
      denominator: calculation.denominator.filter((f) => f.key !== away.key),
    })
  }

  const factorAdd = (page: 'numerator' | 'denominator'): void => {
    const next = newFactor(freeFactorKey(calculation))
    onCalculation({ ...calculation, [page]: [...calculation[page], next] })
  }

  const setResult = (f: ColumnsFactor, result: boolean): void => {
    setFactor(f, { ...f, result })
  }

  const columnsFactors = allFactors(calculation)
    .filter((f): f is ColumnsFactor => f.kind === 'column')
  const dataFactors = allFactors(calculation).filter((f) => f.kind === 'dataField')

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
            <Button onClick={list.onNeu}>+ Berechnung</Button>
            <Button kind="risk" onClick={list.onAway}>Diese entfernen</Button>
          </div>
        )}

        {flaws.length > 0 && (
          <ul className="flex flex-col gap-0.5 rounded border border-fehler/60 p-2 text-dicht text-fehler">
            {flaws.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}

        <Step
          nr={1}
          title="Name und Formel"
          hint={'Links steht die Größe, die sich zuerst ergibt; rechts ihre Faktoren und '
            + 'Teiler. Einheit und Datenfeld stehen direkt beim Operanden, nicht in einer '
            + 'eigenen Liste: sonst stellte man sie weit weg von dem ein, wofür sie gelten.'}
        >
          <Field
            placeholder="Name der Berechnung"
            defaultValue={calculation.name}
            onBlur={(e) => onCalculation({ ...calculation, name: e.currentTarget.value.trim() })}
          />

          <span className="text-dicht text-matt">Ergebnisgröße (links vom Gleichheitszeichen)</span>
          <FactorRow
            factor={calculation.lead}
            columns={columns}
            sources={sources}
            lead
            onFactor={(f) => setFactor(calculation.lead, f)}
          />

          <span className="text-dicht text-matt">mal (Zähler)</span>
          {calculation.numerator.map((f) => (
            <FactorRow
              key={f.key}
              factor={f}
              columns={columns}
              sources={sources}
              onFactor={(next) => setFactor(f, next)}
              onAway={() => factorAway(f)}
            />
          ))}
          <Button onClick={() => factorAdd('numerator')}>+ Faktor</Button>

          <span className="text-dicht text-matt">geteilt durch (Nenner)</span>
          {calculation.denominator.map((f) => (
            <FactorRow
              key={f.key}
              factor={f}
              columns={columns}
              sources={sources}
              onFactor={(next) => setFactor(f, next)}
              onAway={() => factorAway(f)}
            />
          ))}
          <Button onClick={() => factorAdd('denominator')}>+ Teiler</Button>

          <p className={probe === '' ? 'text-dicht text-matt' : 'text-dicht text-fehler'}>
            {probe === ''
              ? 'Die Einheiten beider Seiten passen zusammen.'
              : probe}
          </p>
        </Step>

        <Step
          nr={2}
          title="Rechenrichtungen und Rundung"
          hint={'Jede angekreuzte Größe kann aus den übrigen entstehen. Gerundet wird erst '
            + 'das fertige Ergebnis, darum steht die Rundung bei der Größe und nicht bei der Formel.'}
        >
          {columnsFactors.map((f) => (
            <div key={f.key} className="flex flex-col gap-1 rounded border border-linie p-2">
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
                  title="Nachkommastellen dieses Ergebnisses"
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
                <span className="text-dicht text-matt">
                  {directionAsText(calculation, f.key, (k) => titleOf(k) ?? '?')}
                </span>
              )}
            </div>
          ))}
        </Step>

        <Step
          nr={3}
          title="Datensatzzuordnung"
          hint={'Ein Datenfeld liefert den Wert des Satzes, der FÜR DIESE ZEILE gewählt ist — '
            + 'über die Schlüsselpaare unter „Weitere Quellen". Ist keiner eindeutig zugeordnet, '
            + 'rechnet die Zeile nicht; der erste Satz einer Quelle wäre geraten.'}
        >
          {dataFactors.length === 0
            ? <p className="text-dicht text-matt">Diese Berechnung liest kein Datenfeld.</p>
            : dataFactors.map((f) => {
              const source = sources.find(
                (q) => f.kind === 'dataField' && f.field.startsWith(`${q.source.id}::`),
              )
              const pairs = source?.pairs ?? []
              return (
                <div key={f.key} className="rounded border border-linie p-2 text-dicht">
                  <span className="text-ui">{name(f)}</span>
                  <div className="text-matt">
                    {source === undefined
                      ? 'Noch keine Datenquelle gewählt.'
                      : pairs.length === 0
                        ? `Quelle „${source.source.name}" ist über kein Schlüsselpaar verbunden — `
                          + 'die Zeile kann keinen Satz zuordnen.'
                        : `Quelle „${source.source.name}", verbunden über `
                          + pairs.map((p) => `${p.ofField} → ${p.toField}`).join(', ')}
                  </div>
                </div>
              )
            })}
        </Step>

        <Step
          nr={4}
          title="Vorschau"
          hint="Lass genau ein Feld leer — es wird berechnet."
        >
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
          <p className={preview.kind === 'result' || preview.kind === 'stimmt'
            ? 'text-dicht text-matt'
            : 'text-dicht text-fehler'}
          >
            {preview.kind === 'result'
              ? `${name(allFactors(calculation).find((f) => f.key === preview.key) ?? calculation.lead)} = ${preview.text} ${unitShort(
                allFactors(calculation).find((f) => f.key === preview.key)?.unit ?? '',
              )}`.trim()
              : preview.kind === 'stimmt'
                ? 'Alle Werte gefüllt und stimmig.'
                : preview.kind === 'open'
                  ? 'Es fehlt mehr als ein Wert — es wird nicht geraten.'
                  : preview.text}
          </p>
          {resultFactors(calculation).length === 0 && (
            <p className="text-dicht text-fehler">Keine Größe darf Ergebnis sein.</p>
          )}
        </Step>
      </div>
    </Dialog>
  )
}
