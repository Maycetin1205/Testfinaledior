import { useState, type ReactNode } from 'react'
import { Button } from '@/editor/widgets/Button'
import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import {
  choiceOf,
  fieldPrefixFromInput,
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
    const merged: SourceChoice = { ...choice, ...next.choice }
    // Positions always hang under the document's header record, also after
    // they were fetched by a relation for a while.
    const c: SourceChoice = id === 'documentItem' && merged.headerKey === '' ? { ...merged, headerKey: POSITIONS_UNDER } : merged
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

  // What the source delivers, in one choice so nothing moves: all records
  // when the mask opens, the open record, or the rows a GET relation fetches.
  const fetches = choice.load !== null
  const loaders = relations.filter((r) => r.positions !== undefined)
  const delivers = [
    { value: 'list', name: 'alle Sätze beim Öffnen' },
    ...(preset.openRecord !== undefined ? [{ value: 'open', name: 'den offenen Satz' }] : []),
    ...(preset.fetches ? loaders.map((r) => ({ value: `get:${r.id}`, name: `per GET: ${r.name}` })) : []),
  ]
  const delivered = fetches && choice.load ? `get:${choice.load.relationId}` : choice.openRecord ? 'open' : 'list'
  const chooseDelivery = (v: string) => {
    if (v === delivered) return
    if (v.startsWith('get:')) {
      const keep = choice.load
      save({
        choice: {
          openRecord: false,
          load: {
            relationId: v.slice('get:'.length),
            documentKindField: keep?.documentKindField ?? '',
            documentNumberField: keep?.documentNumberField ?? '',
            yearField: keep?.yearField ?? '',
            archiveField: keep?.archiveField ?? '',
            endFields: keep?.endFields ?? [],
          },
        },
      })
      return
    }
    save({ choice: { openRecord: v === 'open', load: null } })
  }
  const fetchesValue = listed.delivery.kind === 'relationValue'
  const asksArea = listed.order.kind === 'mask'
  const asksPrefix = preset.prefixed || (source.fieldPrefix ?? '') !== ''
  const getters = relations.filter((r) => r.verb === 'GET_RELATION')

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-[6px] border-b border-line px-[12px] py-[6px]">
      <div className="contents">
        <Row name="Art">
          <PickerControl
            name="Art"
            className="h-[24px] w-[170px] text-dense"
            groups={[{ key: 'kinds', entries: PRESET_IDS.map((id) => ({ value: id, name: sourcePreset(id).name })) }]}
            value={source.preset}
            onChoose={(v) => choosePreset(v as PresetId)}
          />
        </Row>

        {delivers.length > 1 && (
          <Row name="Liefert">
            <PickerControl
              name="Liefert"
              className="h-[24px] w-[260px] text-dense"
              groups={[{ key: 'delivers', entries: delivers }]}
              value={delivered}
              onChoose={chooseDelivery}
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

// One setting: its name, then its control, side by side with the next.
// A wide one takes a line of its own.
function Row({ name, wide = false, children }: { name: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`flex min-h-[26px] items-center gap-[8px] ${wide ? 'basis-full' : ''}`}>
      <span className="shrink-0 text-dense text-muted">{name}</span>
      <div className={`flex min-w-0 items-center ${wide ? 'flex-1' : ''}`}>{children}</div>
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
      className={`h-[24px] w-[120px] rounded border border-line bg-panel px-[8px] text-ui outline-none focus:border-accent ${mono ? 'font-mono text-dense' : ''} ${ok ? 'text-ink' : 'text-error'}`}
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
      className="h-[24px] w-[280px] text-dense"
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
        <div key={i} className="basis-full">
        <ParameterRow
          number={i + 1}
          template={raw}
          binding={value.parameter[i] ?? { source: 'fixed', value: '' }}
          choices={choices}
          placeholder={raw}
          onChange={(b) => onChange({ relationId: value.relationId, parameter: template.parameter.map((_, k) => (k === i ? b : value.parameter[k] ?? { source: 'fixed', value: '' })) })}
        />
        </div>
      ))}
    </>
  )
}

// The fields of an ERP mask, read from the text SoftEngine shows for it.
function MaskFields({ onRead }: { onRead: (fields: DataField[], prefix: string) => void }) {
  const [text, setText] = useState('')
  return (
    <Row name="Felder einlesen" wide>
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
