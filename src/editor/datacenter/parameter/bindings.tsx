import type { ReactNode } from 'react'
import { Field } from '@/editor/widgets/Field'
import type { ListEntry, ListGroup } from '@/editor/widgets/List'
import { PickerControl } from '../../inspector/controls/PickerControl'
import {
  ACTION_PLACEHOLDER,
  type Parameter,
} from '../../../core/data/actions'
import {
  sourcesKey,
  type DataSource,
  type DataField,
} from '../../../core/data/dataSources'
import { PLACEHOLDER_PLAIN_TEXT, blockValueKey } from '../parameterText'
import type { BindingProps } from './choices'

const PLACEHOLDER_ENTRIES: ListEntry[] = ACTION_PLACEHOLDER.map((value) => ({
  value,
  name: PLACEHOLDER_PLAIN_TEXT[value]?.name ?? value,
  key: value,
}))

function Pair({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>
}

function fieldGroup(fields: readonly DataField[], source?: DataSource): ListGroup {
  return {
    key: 'fields',
    name: source?.name,
    badge: source ? sourcesKey(source) : undefined,
    entries: fields.map((f) => ({ value: f.code, name: f.name, badge: f.code })),
  }
}

function blockEntries(
  list: readonly { blockId: string; label: string }[],
  blockId: string | undefined,
): ListEntry[] {
  const entries: ListEntry[] = list.map((e) => ({ value: e.blockId, name: e.label }))
  if (blockId !== undefined && blockId !== '' && !list.some((e) => e.blockId === blockId)) {
    entries.push({ value: blockId, name: '(gelöschter Baustein)' })
  }
  return entries
}

function Note({ text }: { text: string }) {
  return (
    <div className="flex h-steuer min-w-0 items-center rounded border border-linie bg-control px-2 text-ui text-matt">
      {text}
    </div>
  )
}

export function EmptyBinding() {
  return <Note text="empty" />
}

export function PreviousResultBinding() {
  return <Note text="Ergebnis des vorherigen Schritts" />
}

export function TextBinding({ binding, placeholder, onChange }: BindingProps) {
  return (
    <Field
      value={binding.value}
      placeholder={placeholder ?? (binding.source === 'seVariable' ? 'Variablenname' : 'Wert')}
      onChange={(e) => onChange({ ...binding, value: e.currentTarget.value })}
    />
  )
}

export function PlaceholderBinding({ binding, onChange }: BindingProps) {
  return (
    <PickerControl
      name="Ereigniswert"
      groups={[{ key: 'placeholder', entries: PLACEHOLDER_ENTRIES }]}
      value={binding.value}
      onChoose={(value) => onChange({ ...binding, value: value })}
    />
  )
}

export function DataFieldBinding({ binding, choices, onChange }: BindingProps) {
  const source = choices.dataSources.find((s) => s.id === binding.sourceId)
  return (
    <Pair>
      <PickerControl
        name="Datenquelle"
        groups={[{
          key: 'sources',
          entries: choices.dataSources.map((s) => ({
            value: s.id,
            name: s.name,
            key: sourcesKey(s),
          })),
        }]}
        value={binding.sourceId ?? ''}
        placeholder="— Quelle —"
        onChoose={(id) => onChange({ ...binding, sourceId: id, value: '' })}
      />
      <PickerControl
        name="Feld der Datenquelle"
        groups={[fieldGroup(source?.fields ?? [], source)]}
        value={binding.value}
        placeholder="— Feld —"
        onChoose={(code) => onChange({ ...binding, value: code })}
      />
    </Pair>
  )
}

export function ChosenRowBinding({ binding, choices, onChange }: BindingProps) {
  const chosen = choices.giver.find((g) => g.blockId === binding.blockId)
  return (
    <Pair>
      <PickerControl
        name="Auswahl-Geber"
        groups={[{ key: 'giver', entries: blockEntries(choices.giver, binding.blockId) }]}
        value={binding.blockId ?? ''}
        placeholder="— Baustein —"
        onChoose={(id) => onChange({ ...binding, blockId: id, value: '' })}
      />
      <PickerControl
        name="Feld der gewählten Zeile"
        groups={[fieldGroup(chosen?.fields ?? [])]}
        value={binding.value}
        placeholder="— Feld —"
        onChoose={(code) => onChange({ ...binding, value: code })}
      />
    </Pair>
  )
}

export function CellsBinding({ binding, choices, onChange }: BindingProps) {
  const captured = binding.source === 'captureCell'
  const list = captured
    ? choices.captures
    : binding.source === 'changeCell' ? choices.changes : choices.deletions
  const table = list.find((t) => t.blockId === binding.blockId)
  return (
    <Pair>
      <PickerControl
        name="Erfassung"
        groups={[{ key: 'tables', entries: blockEntries(list, binding.blockId) }]}
        value={binding.blockId ?? ''}
        placeholder="— Erfassung —"
        onChoose={(id) => onChange({ ...binding, blockId: id, value: '' })}
      />
      <PickerControl
        name={captured ? 'Spalte der Erfassungszeile' : 'Spalte der Zeile'}
        groups={[{
          key: 'columns',
          entries: (table?.columns ?? []).map((s) => ({
            value: s.key,
            name: s.title,
          })),
        }]}
        value={binding.value}
        placeholder="— Spalte —"
        onChoose={(key) => onChange({ ...binding, value: key })}
      />
    </Pair>
  )
}

export function BlockBinding({ binding, choices, onChange }: BindingProps) {
  const current = binding.blockId !== undefined && binding.blockId !== ''
    ? blockValueKey(binding.blockId, binding.value)
    : ''
  return (
    <PickerControl
      name="Baustein"
      groups={[{
        key: 'blocks',
        entries: choices.blockValues.map((o) => ({ value: o.key, name: o.label })),
      }]}
      value={current}
      placeholder="— Baustein —"
      onChoose={(key) => {
        const chosen = choices.blockValues.find((option) => option.key === key)
        onChange(chosen
          ? { source: 'block_value', blockId: chosen.blockId, value: chosen.prop }
          : { source: 'block_value', blockId: '', value: '' })
      }}
    />
  )
}

export function StepResultBinding({ binding, choices, onChange }: BindingProps) {
  const target = choices.steps.find((s) => s.id === binding.value)
  const source = choices.dataSources.find((q) => q.id === target?.sourceId)
  const fields = source?.fields ?? []
  const field = binding.resultField ?? ''

  const setField = (value: string) => {
    const next: Parameter = { ...binding }
    if (value === '') delete next.resultField
    else next.resultField = value
    onChange(next)
  }

  return (
    <Pair>
      <PickerControl
        name="Ergebnis von Schritt"
        groups={[{
          key: 'steps',
          entries: choices.steps.map((s) => ({
            value: s.id,
            name: `Schritt ${s.nr} — ${s.name}`,
          })),
        }]}
        value={binding.value}
        placeholder={choices.steps.length === 0 ? '(kein GET-Schritt davor)' : '— wählen —'}
        onChoose={(id) => {
          const next: Parameter = { ...binding, value: id }
          delete next.resultField
          onChange(next)
        }}
      />
      {fields.length > 0 ? (
        <PickerControl
          name="Feld des Ergebnisses"
          groups={[fieldGroup(fields, source)]}
          value={field}
          emptyText="Ganzes Ergebnis"
          onChoose={setField}
        />
      ) : (
        <Field
          aria-label="Feld des Ergebnisses"
          value={field}
          placeholder="ganzes Ergebnis"
          onChange={(e) => setField(e.currentTarget.value)}
        />
      )}
    </Pair>
  )
}
