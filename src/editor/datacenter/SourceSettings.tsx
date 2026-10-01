import { useState, type ReactNode } from 'react'
import { Button } from '@/editor/widgets/Button'
import { Segment } from '@/editor/widgets/Segment'
import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import {
  choiceOf,
  fieldPrefixFromInput,
  headerKeyFromInput,
  keyDisplay,
  type DataField,
  type DataSource,
} from '../../core/data/dataSources'
import { GET_VALUE_SOURCES, getValueSourceAllowed } from '../../core/data/deliveries/relationValue'
import { readMaskFields } from '../../core/data/maskFields'
import { PRESET_IDS, sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { descriptorFor, type SourceChoice } from '../../core/data/presets/sourcePreset'
import { relationSyntaxAsText, type RelationTemplate } from '../../core/data/relations'
import type { Write } from '../../core/data/writes/writes'
import { PickerControl } from '../controls/PickerControl'
import { useDataSources } from '../state/useDataSources'
import { useRelations } from '../state/useRelations'
import type { ParameterChoices } from './parameter/choices'
import { ParameterRow } from './ParameterRow'
import { Strip } from './GridLines'
import { POSITIONS_UNDER } from './sourceWrite'

// The settings of one source, each a line: its kind, what it delivers, where
// its rows come from, the relation that fetches them or its value, the header
// record it hangs under, the prefix of its fields, the area of a mask. Every
// change is saved at once.
export function SourceSettings({ source, writeFor }: {
  source: DataSource
  writeFor: (preset: PresetId, fields: readonly DataField[], before: Write) => Write
}) {
  const store = useDataSources()
  const relations = useRelations().list
  const preset = sourcePreset(source.preset)
  const choice = choiceOf(source)
  const listed = preset.list(choice)

  const save = (next: { preset?: PresetId; tableId?: string; choice?: Partial<SourceChoice>; fields?: DataField[]; fieldPrefix?: string }) => {
    const id = next.preset ?? source.preset
    const p = sourcePreset(id)
    const c: SourceChoice = { ...choice, ...next.choice }
    const fields = next.fields ?? source.fields
    const prefix = next.fieldPrefix ?? source.fieldPrefix ?? ''
    const { id: _id, fieldPrefix: _prefix, ...rest } = source
    void _id
    void _prefix
    store.update(source.id, {
      ...rest,
      preset: id,
      tableId: next.tableId ?? source.tableId,
      ...descriptorFor(p, c),
      write: writeFor(id, fields, source.write),
      fields,
      ...(prefix !== '' ? { fieldPrefix: prefix } : {}),
    })
  }

  const choosePreset = (id: PresetId) => {
    if (id === source.preset) return
    const p = sourcePreset(id)
    const tableId = p.tableId !== '' ? p.tableId : (p.keyLabel !== '' ? p.key(keyDisplay(source.tableId)) || source.tableId : '')
    save({
      preset: id,
      tableId,
      choice: { headerKey: id === 'documentItem' ? POSITIONS_UNDER : choice.headerKey, openRecord: false, load: null },
    })
  }

  const openRecord = choice.openRecord
  const fetches = choice.load !== null
  const underHeader = listed.order.kind === 'sefileloop' && listed.order.underHeader
  const fetchesValue = listed.delivery.kind === 'relationValue'
  const asksArea = listed.order.kind === 'mask'
  const asksPrefix = preset.prefixed || (source.fieldPrefix ?? '') !== ''
  const loaders = relations.filter((r) => r.positions !== undefined)
  const getters = relations.filter((r) => r.verb === 'GET_RELATION')

  return (
    <div className="flex flex-col">
      <Strip>Einstellungen</Strip>
      <div className="flex flex-col gap-[6px] px-[12px] py-[8px]">
        <Row name="Art">
          <PickerControl
            name="Art"
            className="w-full"
            groups={[{ key: 'kinds', entries: PRESET_IDS.map((id) => ({ value: id, name: sourcePreset(id).name })) }]}
            value={source.preset}
            onChoose={(v) => choosePreset(v as PresetId)}
          />
        </Row>

        {preset.openRecord !== undefined && !fetches && (
          <Row name="Liefert">
            <Segment
              name="Liefert"
              options={[{ value: 'list', name: 'alle Sätze' }, { value: 'open', name: 'den offenen Satz' }]}
              value={openRecord ? 'open' : 'list'}
              onChoose={(v) => save({ choice: { openRecord: v === 'open' } })}
            />
          </Row>
        )}

        {preset.fetches && !openRecord && (
          <>
            <Row name="Zeilen">
              <Segment
                name="Zeilen"
                options={[{ value: 'pushed', name: 'beim Öffnen' }, { value: 'fetch', name: 'per GET holen' }]}
                value={fetches ? 'fetch' : 'pushed'}
                onChoose={(v) => save({
                  choice: {
                    load: v === 'fetch'
                      ? {
                          relationId: loaders[0]?.id ?? '',
                          documentKindField: '',
                          documentNumberField: '',
                          yearField: '',
                          archiveField: '',
                          endFields: [],
                        }
                      : null,
                  },
                })}
              />
            </Row>
            {fetches && choice.load && (
              <Row name="Relation">
                <RelationChoice
                  relations={loaders}
                  value={choice.load.relationId}
                  onChoose={(relationId) => choice.load && save({ choice: { load: { ...choice.load, relationId } } })}
                />
              </Row>
            )}
          </>
        )}

        {underHeader && !fetches && (
          <Row name="Gehört zu">
            <TextCell
              name="Gehört zu"
              value={choice.headerKey}
              mono
              valid={(t) => t.trim() === '' || headerKeyFromInput(t) !== ''}
              onSave={(t) => save({ choice: { headerKey: headerKeyFromInput(t) } })}
            />
          </Row>
        )}

        {fetchesValue && (
          <ValueRelation
            source={source}
            getters={getters}
            value={choice.getValue}
            onChange={(getValue) => save({ choice: { getValue } })}
          />
        )}

        {asksPrefix && (
          <Row name="Feld-Vorsatz">
            <TextCell
              name="Feld-Vorsatz"
              value={source.fieldPrefix ?? ''}
              mono
              valid={(t) => t.trim() === '' || fieldPrefixFromInput(t) !== ''}
              onSave={(t) => save({ fieldPrefix: fieldPrefixFromInput(t) })}
            />
          </Row>
        )}

        {asksArea && (
          <>
            <Row name="Bereich">
              <TextCell
                name="Bereich"
                value={choice.area}
                mono
                valid={(t) => t.trim() !== ''}
                onSave={(t) => save({ choice: { area: t.trim().toUpperCase() } })}
              />
            </Row>
            <MaskFields
              onRead={(fields, prefix) => save({ fields, ...(prefix !== '' ? { fieldPrefix: prefix } : {}) })}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid min-h-control grid-cols-[96px_minmax(0,1fr)] items-center gap-[8px]">
      <span className="truncate text-dense text-muted" title={name}>{name}</span>
      <div className="flex min-w-0 items-center">{children}</div>
    </div>
  )
}

// A typed value, saved on Enter or on leaving; what does not read stays red.
function TextCell({ name, value, mono = false, valid, onSave }: {
  name: string
  value: string
  mono?: boolean
  valid: (text: string) => boolean
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(value)
  const ok = valid(text)
  const commit = () => { if (ok && text !== value) onSave(text) }
  return (
    <input
      key={value}
      aria-label={name}
      value={text}
      spellCheck={false}
      onChange={(e) => setText(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commit(); e.currentTarget.blur() }
        if (e.key === 'Escape') { setText(value); e.currentTarget.blur() }
      }}
      onBlur={commit}
      className={`h-control w-full rounded border border-line bg-panel px-[8px] text-ui outline-none focus:border-accent ${mono ? 'font-mono text-dense' : ''} ${ok ? 'text-ink' : 'text-error'}`}
    />
  )
}

function RelationChoice({ relations, value, onChoose }: {
  relations: readonly RelationTemplate[]
  value: string
  onChoose: (id: string) => void
}) {
  return (
    <PickerControl
      name="Relation"
      className="w-full"
      groups={[{ key: 'relations', entries: relations.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })) }]}
      value={value}
      placeholder=""
      onChoose={onChoose}
    />
  )
}

// The GET relation that fetches the value, and what each of its places gets.
function ValueRelation({ source, getters, value, onChange }: {
  source: DataSource
  getters: readonly RelationTemplate[]
  value: { relationId: string; parameter: readonly Parameter[] }
  onChange: (getValue: { relationId: string; parameter: Parameter[] }) => void
}) {
  const sources = useDataSources().list
  const template = getters.find((r) => r.id === value.relationId)
  const choices: ParameterChoices = {
    dataSources: sources.filter((s) => s.id !== source.id),
    blockValues: [],
    giver: [],
    captures: [],
    changes: [],
    deletions: [],
    steps: [],
    allowed: GET_VALUE_SOURCES,
  }
  return (
    <>
      <Row name="Relation">
        <RelationChoice
          relations={getters}
          value={value.relationId}
          onChoose={(relationId) => {
            const t = getters.find((r) => r.id === relationId)
            onChange({
              relationId,
              parameter: t
                ? relationParameterDefault(t).map((b) => (getValueSourceAllowed(b.source) ? b : { source: 'fixed' as const, value: '' }))
                : [],
            })
          }}
        />
      </Row>
      {template && template.parameter.map((raw, i) => (
        <ParameterRow
          key={i}
          number={i + 1}
          template={raw}
          binding={value.parameter[i] ?? { source: 'fixed', value: '' }}
          choices={choices}
          placeholder={raw}
          onChange={(b) => onChange({ relationId: value.relationId, parameter: template.parameter.map((_, k) => (k === i ? b : value.parameter[k] ?? { source: 'fixed', value: '' })) })}
        />
      ))}
    </>
  )
}

// The fields of an ERP mask, read from the text SoftEngine shows for it.
function MaskFields({ onRead }: { onRead: (fields: DataField[], prefix: string) => void }) {
  const [text, setText] = useState('')
  return (
    <Row name="Felder einlesen">
      <div className="flex w-full flex-col gap-[4px]">
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
            onRead(read.fields, read.prefix)
            setText('')
          }}
        >
          Felder übernehmen
        </Button>
      </div>
    </Row>
  )
}
