import { useState, type ReactNode } from 'react'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Strip } from '@/editor/widgets/Grid'
import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import { splitBinding } from '../../core/block/blockType'
import { choiceOf, fieldPrefixFromInput, type DataSource } from '../../core/data/dataSources'
import { getValueSourceAllowed } from '../../core/data/deliveries/relationValue'
import { readMaskFields } from '../../core/data/maskFields'
import { PRESET_IDS, sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { POSITIONS_RELATION, relationSyntaxAsText, type RelationTemplate } from '../../core/data/relations'
import { sourceChoices } from '../actions/placeChoices'
import { Places } from '../actions/Places'
import { PickerControl } from '../controls/PickerControl'
import type { ListGroup } from '@/editor/widgets/List'
import { useDataSources } from '../state/useDataSources'
import { useRelations } from '../state/useRelations'
import { deliveries, deliveryOf, NEW_POSITIONS, withDelivery, withPreset, withSettings, type SourceData } from './sourceEdit'

const EMPTY: Parameter = { source: 'fixed', value: '' }
const PICKER = 'h-[24px] text-dense'

function useSource(source: DataSource) {
  const store = useDataSources()
  const relationStore = useRelations()
  const relations = relationStore.list
  const choice = choiceOf(source)
  const listed = sourcePreset(source.preset).list(choice)
  const getters = relations.filter((r) => r.verb === 'GET_RELATION')
  const getValue = choice.getValue
  const valued = listed.delivery.kind === 'relationValue'
  return {
    store,
    relationStore,
    relations,
    choice,
    listed,
    getters,
    getValue,
    template: valued ? getters.find((r) => r.id === getValue.relationId) : undefined,
    valued,
    save: (next: SourceData) => store.update(source.id, next),
    saveValue: (relationId: string, parameter: readonly Parameter[]) =>
      store.update(source.id, withSettings(source, { choice: { getValue: { relationId, parameter: [...parameter] } } })),
  }
}

// The settings of a source in one line above its fields: its kind, what it
// delivers, the prefix of its fields, the area of a mask, the relation that
// fetches its value. Every change is saved at once.
export function SourceSettings({ source }: { source: DataSource }) {
  const { store, relationStore, relations, choice, listed, getters, getValue, valued, save, saveValue } = useSource(source)
  const preset = sourcePreset(source.preset)
  const delivers = deliveries(source, relations)
  const restriction = choice.restriction
  const saveRestriction = (change: Partial<typeof restriction>) =>
    save(withSettings(source, { choice: { restriction: { ...restriction, ...change } } }))

  return (
    <div className="flex h-[30px] shrink-0 items-center gap-[18px] overflow-hidden border-b border-line bg-control px-[12px]">
      <Setting name="Art">
        <PickerControl
          name="Art"
          className={cn(PICKER, 'w-[150px]')}
          groups={[{ key: 'kinds', entries: PRESET_IDS.map((id) => ({ value: id, name: sourcePreset(id).name })) }]}
          value={source.preset}
          onChoose={(id) => { if (id !== source.preset) save(withPreset(source, id as PresetId)) }}
        />
      </Setting>

      {delivers.length > 1 && (
        <Setting name="Liefert">
          <PickerControl
            name="Liefert"
            className={cn(PICKER, 'w-[240px]')}
            groups={[{ key: 'delivers', entries: delivers }]}
            value={deliveryOf(source)}
            onChoose={(v) => {
              if (v === deliveryOf(source)) return
              const value = v === NEW_POSITIONS ? `get:${relationStore.add(POSITIONS_RELATION).id}` : v
              save(withDelivery(source, value))
            }}
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

      {listed.delivery.kind === 'message' && (
        <>
          <Setting name="Belegart">
            <TextCell
              name="Belegart"
              value={restriction.documentKind}
              valid={() => true}
              onSave={(t) => saveRestriction({ documentKind: t.trim() })}
            />
          </Setting>
          <Setting name="Adresse">
            <PickerControl
              name="Adresse"
              className={cn(PICKER, 'w-[200px]')}
              groups={openRecordFields(store.list, source.id)}
              value={restriction.address ? `${restriction.address.sourceId}::${restriction.address.code}` : ''}
              emptyText="alle"
              onChoose={(v) => {
                const { sourceId, code } = splitBinding(v)
                saveRestriction({ address: v === '' ? null : { sourceId, code } })
              }}
            />
          </Setting>
        </>
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
          <RelationChoice
            getters={getters}
            value={getValue.relationId}
            onChoose={(t) => saveValue(t.id, relationParameterDefault(t).map((b) => (getValueSourceAllowed(b.source) ? b : EMPTY)))}
          />
        </Setting>
      )}
    </div>
  )
}

// Below the fields: the places of the relation that fetches the value, or
// the fields read from an ERP mask.
export function SourceBelow({ source }: { source: DataSource }) {
  const { store, listed, getValue, template, saveValue } = useSource(source)
  if (template) {
    return (
      <div className="flex max-h-[45%] shrink-0 flex-col border-t border-line">
        <Strip>Stellen der Relation</Strip>
        <Places
          template={template}
          filled={{ parameter: getValue.parameter, extraParameter: [] }}
          choices={sourceChoices(store.list, source.id)}
          extras={false}
          onChange={(filled) => saveValue(getValue.relationId, filled.parameter)}
        />
      </div>
    )
  }
  return listed.order.kind === 'mask' ? <MaskFields source={source} /> : null
}

function RelationChoice({ getters, value, onChoose }: {
  getters: readonly RelationTemplate[]
  value: string
  onChoose: (relation: RelationTemplate) => void
}) {
  return (
    <PickerControl
      name="Relation"
      className={cn(PICKER, 'w-[280px]')}
      groups={[{ key: 'relations', entries: getters.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })) }]}
      value={value}
      onChoose={(id) => {
        const t = getters.find((r) => r.id === id)
        if (t) onChoose(t)
      }}
    />
  )
}

// The fields of every source that delivers the open record, as groups of a
// list: where an ERP query reads the address whose documents it asks for.
function openRecordFields(sources: readonly DataSource[], ownId: string): ListGroup[] {
  return sources
    .filter((s) => s.id !== ownId && choiceOf(s).openRecord && s.fields.length > 0)
    .map((s) => ({
      key: s.id,
      name: s.name,
      entries: s.fields.map((f) => ({ value: `${s.id}::${f.code}`, name: f.name })),
    }))
}

// One setting: its name, then its control.
function Setting({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-[8px]">
      <span className="text-dense text-muted">{name}</span>
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
  // What is typed while the cell is being edited; otherwise it shows what is stored.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value
  const ok = valid(text)
  const commit = () => {
    if (draft !== null && ok && draft !== value) onSave(draft)
    setDraft(null)
  }
  return (
    <input
      aria-label={name}
      value={text}
      spellCheck={false}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commit(); e.currentTarget.blur() }
      }}
      onBlur={commit}
      className={cn(
        'h-[24px] w-[110px] rounded border border-line bg-panel px-[8px] font-mono text-dense outline-none focus:border-accent',
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
    <div className="flex shrink-0 flex-col border-t border-line">
      <Strip>Felder einlesen</Strip>
      <div className="flex flex-col gap-[6px] p-[8px]">
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
    </div>
  )
}
