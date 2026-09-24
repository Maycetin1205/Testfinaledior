import { useMemo, useState } from 'react'
import { Field } from '@/editor/widgets/Field'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/Button'
import { Row } from '@/editor/widgets/Row'
import { Choice } from '@/editor/widgets/Choice'
import {
  relationParameterDefault,
  type Parameter,
} from '../../core/data/actions'
import {
  aliasOf,
  choiceOf,
  fieldPrefixFromInput,
  keyDisplay,
  headerKeyFromInput,
  type DataSource,
} from '../../core/data/dataSources'
import { GET_VALUE_SOURCES, getValueSourceAllowed } from '../../core/data/deliveries/relationValue'
import { PRESET_IDS, sourcePreset, type PresetId } from '../../core/data/presets/presets'
import { EMPTY_CHOICE, descriptorFor } from '../../core/data/presets/sourcePreset'
import { readMaskFields } from '../../core/data/maskFields'
import { relationFitsToSearch } from '../../core/data/relations'
import { useDataSources } from '../state/useDataSources'
import { useRelations } from '../state/useRelations'
import { ParameterRow } from './ParameterRow'
import type { ParameterChoices } from './parameter/choices'
import { RelationPicker } from './RelationPicker'
import { SelectControl } from '../inspector/controls/SelectControl'
import { FieldList } from './FieldList'
import {
  EMPTY_ROW,
  rowFromField,
  rowsCode,
  rowsLength,
  type FieldRow,
} from './fieldRow'
import { FormCard } from './FormCard'

const FIELD_CODE = /^\d+_\d+$/

interface DataSourceFormProps {
  source?: DataSource
  onClose: () => void
}

export function DataSourceForm({ source, onClose }: DataSourceFormProps) {
  const store = useDataSources()
  const saved = source ? choiceOf(source) : EMPTY_CHOICE
  const [name, setName] = useState(source?.name ?? '')
  const [presetId, setPresetId] = useState<PresetId>(source?.preset ?? 'idb')
  const [keyInput, setKeyInput] = useState(
    source && sourcePreset(source.preset).keyLabel !== '' ? keyDisplay(source.tableId) : '',
  )
  const [headerKeyInput, setHeaderKeyInput] = useState(saved.headerKey)

  const [prefixInput, setPrefixInput] = useState(source?.fieldPrefix ?? '')
  const [areaInput, setAreaInput] = useState(saved.area)

  const [maskText, setMaskText] = useState('')

  const [delivery, setDelivery] = useState<'list' | 'openRecord'>(
    saved.openRecord ? 'openRecord' : 'list',
  )

  const load = saved.load
  const [rowsOrigin, setRowsOrigin] = useState<'pushed' | 'fetch'>(load ? 'fetch' : 'pushed')
  const [loadRelationId, setLoadRelationId] = useState(load?.relationId ?? '')
  const fieldMapping = {
    documentKindField: load?.documentKindField ?? '',
    documentNumberField: load?.documentNumberField ?? '',
    yearField: load?.yearField ?? '',
    archiveField: load?.archiveField ?? '',
    endFields: load?.endFields ?? [],
  }
  const [rows, setRows] = useState<FieldRow[]>(
    source && source.fields.length > 0

      ? source.fields.map((f) => rowFromField(
          f, source.fieldPrefix ?? '', sourcePreset(source.preset).columnsLabel !== '',
        ))
      : [{ ...EMPTY_ROW }],
  )

  const [recordNumber, setRecordNumber] = useState(saved.recordField)

  const [showError, setShowError] = useState(false)

  const relation = useRelations()
  const getTemplates = relation.list
  const [getRelationId, setGetRelationId] = useState(saved.getValue.relationId)
  const [getParams, setGetParams] = useState<Parameter[]>([...saved.getValue.parameter])
  const [getSearch, setGetSearch] = useState('')

  const preset = sourcePreset(presetId)
  const listed = preset.list(EMPTY_CHOICE)
  const columnsNames = preset.columnsLabel !== ''
  const asksKey = preset.keyLabel !== ''

  const asksHeaderKey = listed.order.kind === 'sefileloop' && listed.order.underHeader

  const asksArea = listed.order.kind === 'mask'

  const fetchPossible = preset.fetches

  const prefix = fieldPrefixFromInput(prefixInput)

  const asksPrefix = preset.prefixed || prefix !== ''
  const fetchesRows = fetchPossible && rowsOrigin === 'fetch'

  const deliverySelectable = preset.openRecord !== undefined && !fetchesRows
  const openRecord = deliverySelectable && delivery === 'openRecord'

  const giverOptions = store.list.filter((s) => s.id !== source?.id)

  const fetchesValue = listed.delivery.kind === 'relationValue'
  const getRelation = getTemplates.find((r) => r.id === getRelationId)
  const visibleRelation = useMemo(
    () => getTemplates.filter((entry) => relationFitsToSearch(entry, getSearch)),
    [getTemplates, getSearch],
  )

  const getChoices: ParameterChoices = {
    dataSources: giverOptions,
    blockValues: [],
    giver: [],
    captures: [],
    changes: [],
    deletions: [],
    steps: [],
    allowed: GET_VALUE_SOURCES,
  }

  function chooseGetRelation(id: string): void {
    setGetRelationId(id)
    const template = getTemplates.find((r) => r.id === id)
    setGetParams(template
      ? relationParameterDefault(template).map((binding) =>
          getValueSourceAllowed(binding.source)
            ? binding
            : { source: 'fixed' as const, value: '' })
      : [])
  }

  let getError = ''
  if (fetchesValue && getRelationId === '') getError = 'Wähle die Relation, die den Wert holt.'
  else if (fetchesValue && getRelation !== undefined && getRelation.verb !== 'GET_RELATION') {
    getError = 'Nur eine lesende Relation (GET) liefert einen Wert zurück.'
  }

  function choosePreset(next: PresetId): void {
    setPresetId(next)
  }

  const nameDouble = store.list.some(
    (s) => s.id !== source?.id && aliasOf(s.name) === aliasOf(name),
  )
  let nameError = ''
  if (name.trim() === '') nameError = 'Anzeigename fehlt.'
  else if (nameDouble) nameError = 'Diesen Namen trägt schon eine andere Quelle.'
  const keyError =
    asksKey && preset.key(keyInput) === ''
      ? `${preset.keyLabel} fehlt.`
      : ''

  const headerKeyError =
    asksHeaderKey && headerKeyInput.trim() !== '' && headerKeyFromInput(headerKeyInput) === ''
      ? 'Ungültig.'
      : ''

  const areaError = asksArea && areaInput.trim() === ''
    ? 'Bereich fehlt.'
    : ''

  function maskFieldsAdopt() {
    const read = readMaskFields(maskText)
    if (read === null) return
    setRows(read.fields.map((f) => rowFromField(f, read.prefix, false)))
    if (read.prefix !== '') setPrefixInput(read.prefix)
    setMaskText('')
  }
  const rowsError = rows.map((z) => {
    if (z.label.trim() === '') return 'Klarname fehlt.'
    if (!columnsNames && FIELD_CODE.test(z.label.trim())) {
      return 'Klarname darf kein Feldcode sein.'
    }
    if (rowsCode(z, prefix, columnsNames) === '') {
      return columnsNames
        ? 'Spaltenname fehlt (ohne Komma).'
        : 'Position und Länge als Zahlen angeben.'
    }
    return ''
  })
  const codes = rows.map((z) => rowsCode(z, prefix, columnsNames))
  const doubleError = codes.some((c, i) => c !== '' && codes.indexOf(c) !== i)
    ? (columnsNames
        ? 'Zwei Felder zeigen auf dieselbe Spalte.'
        : 'Zwei Felder haben dieselbe Position + Länge.')
    : ''

  const recordNumberOptions = [
    { value: '', name: 'Nicht gebunden' },
    ...rows
      .map((z, i) => ({ code: codes[i] ?? '', label: z.label.trim() }))
      .filter((e) => e.code !== '' && e.label !== '')
      .map((e) => ({ value: e.code, name: e.label, detail: e.code })),
  ]

  if (recordNumber !== '' && !recordNumberOptions.some((o) => o.value === recordNumber)) {
    recordNumberOptions.push({ value: recordNumber, name: recordNumber })
  }

  const positionTemplates = getTemplates.filter((r) => r.positions !== undefined)
  const loadRelationError = fetchesRows && !positionTemplates.some((r) => r.id === loadRelationId)
    ? 'Wähle die Relation, die die Positionen holt.'
    : ''
  const allError = [
    nameError, keyError, headerKeyError, areaError, doubleError,
    loadRelationError, getError,
    ...rowsError,
  ]

  function save() {
    if (allError.some((f) => f !== '')) {
      setShowError(true)
      return
    }
    const data: Omit<DataSource, 'id'> = {
      name: name.trim(),
      preset: presetId,
      tableId: asksKey ? preset.key(keyInput) : preset.tableId,
      ...descriptorFor(preset, {
        headerKey: asksHeaderKey ? headerKeyFromInput(headerKeyInput) : '',
        area: asksArea ? areaInput.trim().toUpperCase() : '',
        openRecord,
        load: fetchesRows ? { relationId: loadRelationId, ...fieldMapping } : null,
        getValue: { relationId: getRelationId, parameter: getParams },
        recordField: recordNumber,
      }),

      ...(prefix !== '' ? { fieldPrefix: prefix } : {}),
      fields: rows.map((z) => {
        const length = rowsLength(z)
        return {
          code: rowsCode(z, prefix, columnsNames),
          name: z.label.trim(),
          ...(length === undefined ? {} : { length }),
        }
      }),
    }
    if (source) store.update(source.id, data)
    else store.add(data)
    onClose()
  }

  return (
    <FormCard title={source ? 'Datenquelle bearbeiten' : 'Neue Datenquelle'} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Row label="Anzeigename" error={showError ? nameError : undefined}>
          {(f) => (
            <Field
              {...f}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Row>

        <SelectControl
          label="Art"
          value={presetId}
          options={PRESET_IDS.map((id) => ({ value: id, name: sourcePreset(id).name }))}
          onChange={(v) => choosePreset(v as PresetId)}
        />

        {asksKey && (
          <Row label={preset.keyLabel} error={showError ? keyError : undefined}>
            {(f) => (
              <Field
                {...f}
                value={keyInput}
                className="w-32"
                onChange={(e) => setKeyInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {asksArea && (
          <Row label="Bereich" error={showError ? areaError : undefined}>
            {(f) => (
              <Field
                {...f}
                value={areaInput}
                className="w-32"
                onChange={(e) => setAreaInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {asksArea && (
          <Row label="Felder einlesen">
            {() => (
              <div className="flex flex-col gap-1">
                <textarea
                  value={maskText}
                  onChange={(e) => setMaskText(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-line bg-panel p-1.5 font-mono text-dense"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={maskFieldsAdopt} disabled={maskText.trim() === ''}>
                    Felder übernehmen
                  </Button>
                </div>
              </div>
            )}
          </Row>
        )}

        {asksPrefix && (
          <Row label="Feld-Vorsatz">
            {(f) => (
              <Field
                {...f}
                value={prefixInput}
                className="w-32"
                onChange={(e) => setPrefixInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {deliverySelectable && (
          <SelectControl
            label="Was liefert die Quelle?"
            value={delivery}
            options={[
              { value: 'list', name: 'Mehrere Sätze — eine Liste' },
              { value: 'openRecord', name: 'Nur den Satz, der gerade offen ist' },
            ]}
            onChange={(v) => setDelivery(v as 'list' | 'openRecord')}
          />
        )}

        {fetchPossible && !openRecord && (
          <SelectControl
            label="Woher kommen die Zeilen?"
            value={rowsOrigin}
            options={[
              { value: 'pushed', name: 'SoftEngine schickt sie beim Laden' },
              { value: 'fetch', name: 'Die Maske holt sie, sobald ein Beleg angeklickt ist' },
            ]}
            onChange={(v) => setRowsOrigin(v as 'pushed' | 'fetch')}
          />
        )}
        {fetchesRows && (
          <Row label="Relation" error={showError ? loadRelationError : undefined}>
            {(f) => (
              <Choice
                {...f}
                value={loadRelationId}
                emptyText="— wählen —"
                options={positionTemplates.map((r) => ({ value: r.id, name: r.name }))}
                onChoose={setLoadRelationId}
              />
            )}
          </Row>
        )}

        {asksHeaderKey && !fetchesRows && (
          <Row
            label="Gehört zu"
            error={showError ? headerKeyError : undefined}
          >
            {(f) => (
              <Field
                {...f}
                value={headerKeyInput}
                className="w-32"
                onChange={(e) => setHeaderKeyInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {fetchesValue && (
          <>
            <RelationPicker
              label="Relation"
              entries={visibleRelation}
              relationId={getRelationId}
              search={getSearch}
              onSearch={setGetSearch}
              onSelect={chooseGetRelation}
            />
            {showError && getError !== '' && (
              <p className="break-words text-dense text-error">{getError}</p>
            )}
            {getRelation && (
              <Group title="Parameter">
                {getRelation.parameter.map((raw, index) => (
                  <ParameterRow
                    key={index}
                    number={index + 1}
                    template={raw}
                    binding={getParams[index] ?? { source: 'fixed', value: '' }}
                    choices={getChoices}
                    placeholder={raw}
                    onChange={(value) => setGetParams((old) => {
                      const next = [...old]
                      next[index] = value
                      return next
                    })}
                  />
                ))}
              </Group>
            )}
          </>
        )}

        <FieldList
          columnsNames={columnsNames}
          columnsLabel={preset.columnsLabel}
          rows={rows}
          setRows={setRows}
          rowsError={rowsError}
          doubleError={doubleError}
          showError={showError}
        />

        {preset.writes && (
          <SelectControl
            label="Satznummer"
            value={recordNumber}
            options={recordNumberOptions}
            onChange={setRecordNumber}
          />
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" onClick={save}>Speichern</Button>
        </div>
      </div>
    </FormCard>
  )
}
