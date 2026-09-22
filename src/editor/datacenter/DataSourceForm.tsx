import { useMemo, useState } from 'react'
import { Field } from '@/editor/widgets/Field'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/PushButton'
import { Row } from '@/editor/widgets/Row'
import {
  relationParameterDefault,
  type Parameter,
} from '../../core/data/actions'
import {
  aliasOf,
  sourceKind,
  fieldPrefixFromInput,
  GET_VALUE_SOURCES,
  getValueSourceAllowed,
  keyDisplay,
  keyFromInput,
  headerKeyFromInput,
  LOAD_RELATION_STANDARD,
  SOURCE_KINDS,
  relationNrFromInput,
  tableKeyNeeded,
  type DataSource,
  type SourceKindId,
} from '../../core/data/dataSources'
import { readMaskFields } from '../../core/data/maskFields'
import { relationFitsToSearch } from '../../core/data/relations'
import { useDataSources } from '../state/useDataSources'
import { useRelation } from '../state/useRelations'
import { ParameterRow } from './ParameterRow'
import type { ParameterChoices } from './parameter/choices'
import { RelationSelection } from './RelationPicker'
import { SelectControl } from '../inspector/controls/SelectControl'
import { FieldList } from './FieldList'
import { sourcesWording } from './wording'
import {
  EMPTY_ROW,
  rowFromField,
  rowFilled,
  rowsCode,
  rowsIcon,
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
  const [name, setName] = useState(source?.name ?? '')
  const [kind, setKind] = useState<SourceKindId>(source?.kind ?? 'idb')
  const [keyInput, setKeyInput] = useState(keyDisplay(source?.idbId))
  const [headerKeyInput, setHeaderKeyInput] = useState(source?.headerKeyIndex ?? '')

  const [prefixInput, setPrefixInput] = useState(source?.fieldPrefix ?? '')
  const [areaInput, setAreaInput] = useState(source?.area ?? '')

  const [maskText, setMaskText] = useState('')
  const [maskHint, setMaskHint] = useState('')

  const [delivery, setDelivery] = useState<'list' | 'openRecord'>(
    source?.delivery ?? 'list',
  )

  const load = source?.loadRelation
  const [rowsAway, setRowsAway] = useState<'geschoben' | 'fetch'>(load ? 'fetch' : 'geschoben')
  const [relationNr, setRelationNr] = useState(load?.nr ?? LOAD_RELATION_STANDARD.nr)
  const fieldMapping = {
    documentKindField: load?.documentKindField ?? LOAD_RELATION_STANDARD.documentKindField,
    documentNumberField: load?.documentNumberField ?? LOAD_RELATION_STANDARD.documentNumberField,
    yearField: load?.yearField ?? LOAD_RELATION_STANDARD.yearField,
    archiveField: load?.archiveField ?? LOAD_RELATION_STANDARD.archiveField,
    endFields: load?.endFields ?? LOAD_RELATION_STANDARD.endFields,
  }
  const [rows, setRows] = useState<FieldRow[]>(
    source && source.fields.length > 0

      ? source.fields.map((f) => rowFromField(
          f, source.fieldPrefix ?? '', sourceKind(source.kind).columnsNames,
        ))
      : [{ ...EMPTY_ROW }],
  )

  const [recordNumber, setRecordNumber] = useState(source?.recordField ?? '')

  const [showError, setShowError] = useState(false)

  const relation = useRelation()
  const getTemplates = relation.list
  const [getRelationId, setGetRelationId] = useState(source?.getValue?.relationId ?? '')
  const [getParams, setGetParams] = useState<Parameter[]>(
    source?.getValue ? [...source.getValue.parameter] : [],
  )
  const [getSearch, setGetSearch] = useState('')

  const kindFacts = sourceKind(kind)
  const wording = sourcesWording(kind)
  const keyEnter = tableKeyNeeded(kindFacts)

  const headerKeyEnter = kindFacts.headerKeyPossible

  const areaEnter = kindFacts.areaNeeded

  const fetchPossible = kindFacts.relationLoadPossible

  const prefix = fieldPrefixFromInput(prefixInput)

  const prefixEnter = kindFacts.fieldPrefixPossible || prefix !== ''
  const fetchesRows = fetchPossible && rowsAway === 'fetch'

  const deliverySelectable = kindFacts.varPossible && !fetchesRows
  const openRecord = deliverySelectable && delivery === 'openRecord'

  const giverOptions = store.list.filter((s) => s.id !== source?.id)

  const fetchesValue = kindFacts.getValuePossible
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

  function chooseKind(next: SourceKindId): void {
    setKind(next)
    const newKind = sourceKind(next)
    const standardFields = sourcesWording(next).standardFields
    if (standardFields.length > 0 && !rows.some(rowFilled)) {
      setRows(standardFields.map((f) => rowFromField(f)))
    }
    if (newKind.headerKeyStandard !== '' && headerKeyInput.trim() === '') {
      setHeaderKeyInput(newKind.headerKeyStandard)
    }
  }

  const nameDouble = store.list.some(
    (s) => s.id !== source?.id && aliasOf(s.name) === aliasOf(name),
  )
  let nameError = ''
  if (name.trim() === '') nameError = 'Anzeigename fehlt.'
  else if (nameDouble) nameError = 'Diesen Namen trägt schon eine andere Quelle.'
  const keyError =
    keyEnter && keyFromInput(keyInput, kindFacts.idbShortForm) === ''
      ? `${wording.keyLabel} fehlt (z. B. ${wording.keyExample}).`
      : ''

  const headerKeyError =
    headerKeyEnter && headerKeyInput.trim() !== '' && headerKeyFromInput(headerKeyInput) === ''
      ? 'Ungültig — Beispiel: BEL_0_11.'
      : ''

  const areaError = areaEnter && areaInput.trim() === ''
    ? 'Bereich fehlt (z. B. BEL).'
    : ''

  function maskFieldsAdopt() {
    const read = readMaskFields(maskText)
    if (read === null) {
      setMaskHint('Daraus wird keine Feldbeschreibung. Erwartet wird, was SEDATA.Daten.Masken.<Name> liefert.')
      return
    }
    setRows(read.fields.map((f) => rowFromField(f, read.prefix, false)))
    if (read.prefix !== '') setPrefixInput(read.prefix)
    const parts = [`${read.fields.length} Felder übernommen`]
    if (read.onlyDisplay > 0) parts.push(`${read.onlyDisplay} davon nur Anzeige`)
    if (read.skipped > 0) parts.push(`${read.skipped} ohne Feldcode übersprungen`)
    setMaskHint(`${parts.join(', ')}.`)
    setMaskText('')
  }
  const rowsError = rows.map((z) => {
    if (z.label.trim() === '') return 'Klarname fehlt.'
    if (!kindFacts.columnsNames && FIELD_CODE.test(z.label.trim())) {
      return 'Klarname darf kein Feldcode sein.'
    }
    if (rowsCode(z, prefix, kindFacts.columnsNames) === '') {
      return kindFacts.columnsNames
        ? 'Spaltenname fehlt (ohne Komma).'
        : 'Position und Länge als Zahlen angeben.'
    }
    return ''
  })
  const codes = rows.map((z) => rowsCode(z, prefix, kindFacts.columnsNames))
  const doubleError = codes.some((c, i) => c !== '' && codes.indexOf(c) !== i)
    ? (kindFacts.columnsNames
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
    recordNumberOptions.push({
      value: recordNumber, name: recordNumber, detail: 'kein Feld dieser Quelle',
    })
  }

  const relationNrError = fetchesRows && relationNrFromInput(relationNr) === ''
    ? 'Relationsnummer fehlt — nur Ziffern.'
    : ''
  const allError = [
    nameError, keyError, headerKeyError, areaError, doubleError,
    relationNrError, getError,
    ...rowsError,
  ]

  function save() {
    if (allError.some((f) => f !== '')) {
      setShowError(true)
      return
    }
    const data: Omit<DataSource, 'id'> = {
      name: name.trim(),
      kind: kind,
      ...(keyEnter ? { idbId: keyFromInput(keyInput, kindFacts.idbShortForm) } : {}),

      ...(headerKeyEnter && headerKeyFromInput(headerKeyInput) !== ''
        ? { headerKeyIndex: headerKeyFromInput(headerKeyInput) }
        : {}),

      ...(prefix !== '' ? { fieldPrefix: prefix } : {}),

      ...(areaEnter ? { area: areaInput.trim().toUpperCase() } : {}),

      ...(openRecord ? { delivery: 'openRecord' as const } : {}),

      ...(kindFacts.recordNumberPossible && recordNumber !== ''
        ? { recordField: recordNumber }
        : {}),

      ...(fetchesRows
        ? {
            loadRelation: {
              nr: relationNrFromInput(relationNr),
              ...fieldMapping,
            },
          }
        : {}),

      ...(fetchesValue && getRelationId !== ''
        ? { getValue: { relationId: getRelationId, parameter: getParams } }
        : {}),
      fields: rows.map((z) => {
        const icon = rowsIcon(z)
        return {
          code: rowsCode(z, prefix, kindFacts.columnsNames),
          name: z.label.trim(),
          ...(icon === undefined ? {} : { icon }),
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
              placeholder="z. B. Terminplaner"
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Row>

        <SelectControl
          label="Art"
          value={kind}
          options={SOURCE_KINDS.map((a) => ({ value: a.id, name: sourcesWording(a.id).name }))}
          onChange={(v) => chooseKind(v as SourceKindId)}
        />

        {keyEnter && (
          <Row label={wording.keyLabel} error={showError ? keyError : undefined}>
            {(f) => (
              <Field
                {...f}
                value={keyInput}
                placeholder={`z. B. ${wording.keyExample}`}
                className="w-32"
                onChange={(e) => setKeyInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {areaEnter && (
          <Row label="Bereich" error={showError ? areaError : undefined}>
            {(f) => (
              <Field
                {...f}
                value={areaInput}
                placeholder="z. B. BEL"
                className="w-32"
                onChange={(e) => setAreaInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {areaEnter && (
          <Row label="Felder einlesen">
            {() => (
              <div className="flex flex-col gap-1">
                <textarea
                  value={maskText}
                  onChange={(e) => setMaskText(e.target.value)}
                  rows={3}
                  placeholder="In SoftEngine F12, SEDATA.Daten.Masken.NAME kopieren und hier einfügen"
                  className="w-full rounded border border-linie bg-panel p-1.5 font-mono text-dicht"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={maskFieldsAdopt} disabled={maskText.trim() === ''}>
                    Felder übernehmen
                  </Button>
                  {maskHint !== '' && (
                    <span className="text-dicht text-matt">{maskHint}</span>
                  )}
                </div>
              </div>
            )}
          </Row>
        )}

        {prefixEnter && (
          <Row label="Feld-Vorsatz">
            {(f) => (
              <Field
                {...f}
                value={prefixInput}
                placeholder="z. B. LFA_"
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
            value={rowsAway}
            options={[
              { value: 'geschoben', name: 'SoftEngine schickt sie beim Laden' },
              { value: 'fetch', name: 'Die Maske holt sie, sobald ein Beleg angeklickt ist' },
            ]}
            onChange={(v) => setRowsAway(v as 'geschoben' | 'fetch')}
          />
        )}
        {fetchesRows && (
          <>
            <Row
              label="Relationsnummer"
              error={showError ? relationNrError : undefined}
            >
              {(f) => (
                <Field
                  {...f}
                  value={relationNr}
                  className="w-24"
                  onChange={(e) => setRelationNr(e.target.value)}
                />
              )}
            </Row>
            <p className="text-dicht text-matt">
              Welche Zeile gemeint ist, stellst du am Baustein ein:
              „Auswahl folgen“ → die Tabelle mit den Belegen.
            </p>
          </>
        )}

        {headerKeyEnter && !fetchesRows && (
          <Row
            label="Gehört zu"
            error={showError ? headerKeyError : undefined}
          >
            {(f) => (
              <Field
                {...f}
                value={headerKeyInput}
                placeholder="z. B. BEL_0_11"
                className="w-32"
                onChange={(e) => setHeaderKeyInput(e.target.value)}
              />
            )}
          </Row>
        )}

        {fetchesValue && (
          <>
            <RelationSelection
              label="Relation"
              entries={visibleRelation}
              relationId={getRelationId}
              search={getSearch}
              onSearch={setGetSearch}
              onSelect={chooseGetRelation}
            />
            {showError && getError !== '' && (
              <p className="break-words text-dicht text-fehler">{getError}</p>
            )}
            {getRelation && (
              <Group title="Parameter">
                {getRelation.parameter.map((raw, index) => (
                  <ParameterRow
                    key={index}
                    number={index + 1}
                    template={raw === '' ? '(leer)' : raw}
                    binding={getParams[index] ?? { source: 'fixed', value: '' }}
                    choices={getChoices}
                    placeholder={raw === '' ? '(leer)' : raw}
                    onChange={(value) => setGetParams((old) => {
                      const next = [...old]
                      next[index] = value
                      return next
                    })}
                  />
                ))}
                {getRelation.parameter.length === 0 && (
                  <p className="text-ui text-matt">Keine Parameter.</p>
                )}
              </Group>
            )}
          </>
        )}

        <FieldList
          columnsNames={kindFacts.columnsNames}
          columnsLabel={wording.columnsLabel}
          columnsExample={wording.columnsExample}
          rows={rows}
          setRows={setRows}
          rowsError={rowsError}
          doubleError={doubleError}
          showError={showError}
        />

        {kindFacts.recordNumberPossible && (
          <SelectControl
            label="Satznummer"
            description="Macht eine Zeile eindeutig. Ohne sie kann die Maske neue Zeilen anlegen, aber keine bestehende ändern oder löschen."
            value={recordNumber}
            options={recordNumberOptions}
            onChange={setRecordNumber}
          />
        )}

        <div className="flex justify-end gap-2 border-t border-linie pt-3">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" onClick={save}>Speichern</Button>
        </div>
      </div>
    </FormCard>
  )
}
