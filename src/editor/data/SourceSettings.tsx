import { useState, type ReactNode } from 'react'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import { choiceOf, fieldPrefixFromInput, type DataSource } from '../../core/data/dataSources'
import { getValueSourceAllowed } from '../../core/data/deliveries/relationValue'
import { readMaskFields } from '../../core/data/maskFields'
import { PRESET_IDS, sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { relationSyntaxAsText } from '../../core/data/relations'
import { sourceChoices } from '../actions/placeChoices'
import { Places } from '../actions/Places'
import { PickerControl } from '../controls/PickerControl'
import { useDataSources } from '../state/useDataSources'
import { useRelations } from '../state/useRelations'
import { deliveries, deliveryOf, withDelivery, withPreset, withSettings, type SourceData } from './sourceEdit'

const EMPTY: Parameter = { source: 'fixed', value: '' }

// The settings of a source side by side: its kind, what it delivers, the
// prefix of its fields, the area of a mask, the relation that fetches its
// value. Below, edge to edge, the places of that relation: typed, or a field
// of another source. Every change is saved at once.
export function SourceSettings({ source }: { source: DataSource }) {
  const store = useDataSources()
  const relations = useRelations().list
  const save = (next: SourceData) => store.update(source.id, next)
  const preset = sourcePreset(source.preset)
  const choice = choiceOf(source)
  const listed = preset.list(choice)
  const delivers = deliveries(source, relations)

  const valued = listed.delivery.kind === 'relationValue'
  const getters = relations.filter((r) => r.verb === 'GET_RELATION')
  const getValue = choice.getValue
  const template = valued ? getters.find((r) => r.id === getValue.relationId) : undefined
  const saveValue = (relationId: string, parameter: readonly Parameter[]) =>
    save(withSettings(source, { choice: { getValue: { relationId, parameter: [...parameter] } } }))

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-[6px] border-b border-line px-[12px] py-[6px]">
        <Setting name="Art">
          <PickerControl
            name="Art"
            className="h-[24px] w-[170px] text-dense"
            groups={[{ key: 'kinds', entries: PRESET_IDS.map((id) => ({ value: id, name: sourcePreset(id).name })) }]}
            value={source.preset}
            onChoose={(id) => { if (id !== source.preset) save(withPreset(source, id as PresetId)) }}
          />
        </Setting>

        {delivers.length > 1 && (
          <Setting name="Liefert">
            <PickerControl
              name="Liefert"
              className="h-[24px] w-[260px] text-dense"
              groups={[{ key: 'delivers', entries: delivers }]}
              value={deliveryOf(source)}
              onChoose={(v) => { if (v !== deliveryOf(source)) save(withDelivery(source, v)) }}
            />
          </Setting>
        )}

        {(preset.prefixed || (source.fieldPrefix ?? '') !== '') && (
          <Setting name="Feld-Vorsatz">
            <TextCell
              name="Feld-Vorsatz"
              value={source.fieldPrefix ?? ''}
              valid={(t) => t.trim() === '' || fieldPrefixFromInput(t) !== ''}
              onSave={(t) => save(withSettings(source, { fieldPrefix: fieldPrefixFromInput(t) }))}
            />
          </Setting>
        )}

        {listed.order.kind === 'mask' && (
          <Setting name="Bereich">
            <TextCell
              name="Bereich"
              value={choice.area}
              valid={(t) => t.trim() !== ''}
              onSave={(t) => save(withSettings(source, { choice: { area: t.trim().toUpperCase() } }))}
            />
          </Setting>
        )}

        {valued && (
          <Setting name="Relation">
            <PickerControl
              name="Relation"
              className="h-[24px] w-[280px] text-dense"
              groups={[{ key: 'relations', entries: getters.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })) }]}
              value={getValue.relationId}
              placeholder=""
              onChoose={(relationId) => {
                const t = getters.find((r) => r.id === relationId)
                saveValue(relationId, t ? relationParameterDefault(t).map((b) => (getValueSourceAllowed(b.source) ? b : EMPTY)) : [])
              }}
            />
          </Setting>
        )}

        {listed.order.kind === 'mask' && <MaskFields source={source} />}
      </div>

      {template && (
        <div className="border-b border-line">
          <Places
            template={template}
            filled={{ parameter: getValue.parameter, extraParameter: [] }}
            choices={sourceChoices(store.list, source.id)}
            extras={false}
            fill={false}
            onChange={(filled) => saveValue(getValue.relationId, filled.parameter)}
          />
        </div>
      )}
    </>
  )
}

// One setting: its name, then its control.
function Setting({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[26px] items-center gap-[8px]">
      <span className="shrink-0 text-dense text-muted">{name}</span>
      {children}
    </div>
  )
}

// A typed value, saved on Enter or on leaving; what does not read stays red.
function TextCell({ name, value, valid, onSave }: {
  name: string
  value: string
  valid: (text: string) => boolean
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(value)
  const ok = valid(text)
  const commit = () => { if (ok && text !== value) onSave(text) }
  return (
    <input
      aria-label={name}
      value={text}
      spellCheck={false}
      onChange={(e) => setText(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commit(); e.currentTarget.blur() }
      }}
      onBlur={commit}
      className={cn(
        'h-[24px] w-[120px] rounded border border-line bg-panel px-[8px] font-mono text-dense outline-none focus:border-accent',
        ok ? 'text-ink' : 'text-error',
      )}
    />
  )
}

// The fields of an ERP mask, read from the text SoftEngine shows for it.
function MaskFields({ source }: { source: DataSource }) {
  const store = useDataSources()
  const [text, setText] = useState('')
  return (
    <div className="flex basis-full flex-col gap-[4px]">
      <span className="text-dense text-muted">Felder einlesen</span>
      <textarea
        aria-label="Felder einlesen"
        value={text}
        rows={3}
        onChange={(e) => setText(e.currentTarget.value)}
        className="w-full rounded border border-line bg-panel p-[6px] font-mono text-dense outline-none focus:border-accent"
      />
      <Button
        className="self-start"
        disabled={text.trim() === ''}
        onClick={() => {
          const read = readMaskFields(text)
          if (read === null) return
          store.update(source.id, withSettings(source, {
            fields: read.fields,
            ...(read.prefix !== '' ? { fieldPrefix: read.prefix } : {}),
          }))
          setText('')
        }}
      >
        Felder übernehmen
      </Button>
    </div>
  )
}
